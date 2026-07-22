import type { Page } from "playwright";
import { normalize } from "@/lib/scraping/normalize";
import { baseResult } from "@/lib/scraping/providers/helpers";
import {
  assertOfficialHost,
  gotoOfficial,
  newScrapingPage,
  resolveOfficialPath,
  withBrowser,
} from "@/lib/scraping/utils/browser";
import { slugifyJaPlanName } from "@/lib/scraping/utils/text";
import {
  createEmptyField,
  type ScrapedComparisonValue,
  type ScrapedPlan,
  type ScrapedServiceData,
  type ScraperProvider,
  type ScraperProviderContext,
} from "@/lib/scraping/types";

const ALLOWED_HOSTS = ["colorfulbox.jp"];
const PRICE_PATH = "/price/";
const FUNCTION_PATH = "/function/";
const TARGET_PERIOD = "36ヶ月";

type DualPrice = {
  campaign: number | null;
  renewal: number | null;
  raw: string;
};

type ParsedColorfulBox = {
  planNames: string[];
  prices: DualPrice[];
  initialFeeRaw: string;
  diskValues: string[];
  okRows: Record<string, boolean[]>;
  pageText: string;
};

function parseDualPrice(raw: string): DualPrice {
  const amounts = [...raw.matchAll(/([\d,]+)\s*円/g)].map((m) =>
    Number(m[1].replace(/,/g, "")),
  );
  // 「484円 /月 968円/月で更新」→ campaign, renewal
  if (amounts.length >= 2) {
    return { campaign: amounts[0], renewal: amounts[1], raw };
  }
  return {
    campaign: amounts[0] ?? null,
    renewal: amounts[0] ?? null,
    raw,
  };
}

async function parsePricePage(page: Page): Promise<{
  planNames: string[];
  prices: DualPrice[];
  initialFeeRaw: string;
}> {
  await page.waitForSelector("table", { state: "attached", timeout: 30_000 });
  return page.evaluate((periodHint) => {
    const tables = Array.from(document.querySelectorAll("table"));
    const table = tables[0];
    if (!table) throw new Error("料金表が見つかりません");

    const rows = Array.from(table.querySelectorAll("tr"));
    const header = Array.from(rows[0]?.querySelectorAll("th,td") ?? [])
      .slice(1)
      .map((c) => (c.textContent || "").replace(/\s+/g, " ").trim())
      .filter((h) => /^BOX\d+/i.test(h));

    let initialFeeRaw = "";
    let priceValues: string[] = [];
    for (let r = 1; r < rows.length; r++) {
      const cells = Array.from(rows[r].querySelectorAll("th,td"));
      if (cells.length === 0) continue;
      const label = (cells[0].textContent || "").replace(/\s+/g, " ").trim();
      const rowText = (rows[r].textContent || "").replace(/\s+/g, " ").trim();
      if (/^初期費用/.test(label) || /^初期費用/.test(rowText)) {
        initialFeeRaw = rowText;
        continue;
      }
      if (label.includes(periodHint) || label.includes("36ヶ月")) {
        priceValues = [];
        for (let i = 1; i < cells.length; i++) {
          priceValues.push(
            (cells[i].textContent || "").replace(/\s+/g, " ").trim(),
          );
        }
      }
    }

    return {
      planNames: header,
      priceValues,
      initialFeeRaw,
    };
  }, TARGET_PERIOD).then((raw) => ({
    planNames: raw.planNames,
    prices: raw.priceValues.map(parseDualPrice),
    initialFeeRaw: raw.initialFeeRaw,
  }));
}

async function parseFunctionPage(page: Page): Promise<{
  diskValues: string[];
  okRows: Record<string, boolean[]>;
  pageText: string;
}> {
  await page.waitForSelector("table", { timeout: 30_000 });
  return page.evaluate(() => {
    const okRows: Record<string, boolean[]> = {};
    let diskValues: string[] = [];
    const rows = Array.from(document.querySelectorAll("table tr"));
    for (let r = 0; r < rows.length; r++) {
      const cells = Array.from(rows[r].querySelectorAll("th,td"));
      if (cells.length < 2) continue;
      const label = (cells[0].textContent || "").replace(/\s+/g, " ").trim();
      if (!label) continue;

      if (label.includes("ディスク容量") && label.includes("SSD") && !label.includes("アダルト")) {
        diskValues = [];
        for (let i = 1; i < cells.length; i++) {
          diskValues.push(
            (cells[i].textContent || "").replace(/\s+/g, " ").trim(),
          );
        }
      }

      const marks: boolean[] = [];
      let hasMarkInfo = false;
      for (let i = 1; i < cells.length; i++) {
        const el = cells[i] as HTMLElement;
        const text = (el.textContent || "").replace(/\s+/g, " ").trim();
        const cls = el.className || "";
        const bg = getComputedStyle(el).backgroundImage || "";
        if (cls.includes("ok") || /icon_ok/.test(bg)) {
          marks.push(true);
          hasMarkInfo = true;
        } else if (
          text === "ー" ||
          text === "-" ||
          text === "×" ||
          cls.includes("ng") ||
          /icon_ng/.test(bg)
        ) {
          marks.push(false);
          hasMarkInfo = true;
        } else if (text) {
          marks.push(true);
          hasMarkInfo = true;
        } else {
          marks.push(false);
        }
      }
      if (hasMarkInfo) okRows[label] = marks;
    }

    return {
      diskValues,
      okRows,
      pageText: document.body.innerText.slice(0, 25000),
    };
  });
}

function findOk(
  rows: Record<string, boolean[]>,
  keywords: string[],
): { label: string; values: boolean[] } | null {
  for (const [label, values] of Object.entries(rows)) {
    if (keywords.every((k) => label.includes(k))) return { label, values };
  }
  for (const [label, values] of Object.entries(rows)) {
    if (keywords.some((k) => label.includes(k))) return { label, values };
  }
  return null;
}

function buildPlans(
  parsed: ParsedColorfulBox,
  sourceUrl: string,
): ScrapedPlan[] {
  // 36ヶ月代表値では初期費用無料。1ヶ月契約時の有料表記は raw に残す。
  const initialFee =
    /無料/.test(parsed.initialFeeRaw) || !parsed.initialFeeRaw
      ? 0
      : (normalize.yen(parsed.initialFeeRaw) ?? 0);

  return parsed.planNames.map((rawName, index) => {
    const price = parsed.prices[index];
    const diskRaw = parsed.diskValues[index] ?? "";
    const storage = normalize.storage(diskRaw);
    // BOX1 は更新価格が同じ場合あり
    const regular = price?.renewal ?? price?.campaign ?? null;
    const campaign =
      price?.campaign != null &&
      price.renewal != null &&
      price.campaign < price.renewal
        ? price.campaign
        : price?.campaign ?? null;

    return {
      name: createEmptyField<string>("name", "プラン名", sourceUrl, {
        value: rawName,
        rawValue: rawName,
        confidence: "high",
        status: "found",
      }),
      slugHint: slugifyJaPlanName(rawName),
      regularMonthlyPrice: createEmptyField<number>(
        "regularMonthlyPrice",
        "通常月額",
        sourceUrl,
        regular != null
          ? {
              value: regular,
              rawValue: price?.raw ?? null,
              sourceText: price?.raw
                ? `${TARGET_PERIOD}: ${price.raw}`
                : null,
              confidence: "high",
              status: "found",
              warning:
                price?.renewal != null &&
                price.campaign != null &&
                price.campaign < price.renewal
                  ? "更新後月額を通常月額として取得しています。"
                  : null,
            }
          : { status: "not_found" },
      ),
      campaignMonthlyPrice: createEmptyField<number>(
        "campaignMonthlyPrice",
        "キャンペーン月額",
        sourceUrl,
        campaign != null &&
          price?.renewal != null &&
          campaign < price.renewal
          ? {
              value: campaign,
              rawValue: price?.raw ?? null,
              confidence: "medium",
              status: "found",
              warning: "初回限定割引の月額です。適用期間を確認してください。",
            }
          : {
              status: "ambiguous",
              rawValue: price?.raw ?? null,
              warning: "初回価格と更新価格の区別が弱い、または同額です。",
            },
      ),
      effectiveMonthlyPrice: createEmptyField<number>(
        "effectiveMonthlyPrice",
        "実質月額",
        sourceUrl,
        {
          value: campaign,
          rawValue: price?.raw ?? null,
          confidence: "medium",
          status: "ambiguous",
          warning: "初回価格を実質候補として保持しています。自動反映しません。",
          inferred: true,
        },
      ),
      initialFee: createEmptyField<number>("initialFee", "初期費用", sourceUrl, {
        value: initialFee,
        rawValue: parsed.initialFeeRaw,
        confidence: "high",
        status: "found",
        warning: "3ヶ月以上契約時は無料、1ヶ月契約は別料金です。",
      }),
      billingPeriod: createEmptyField<string>(
        "billingPeriod",
        "契約期間",
        sourceUrl,
        {
          value: TARGET_PERIOD,
          rawValue: TARGET_PERIOD,
          confidence: "medium",
          status: "found",
          warning: "代表値として36ヶ月契約行を採用しています。",
          inferred: true,
        },
      ),
      storageValue: createEmptyField<number>("storageValue", "容量", sourceUrl, {
        ...(storage.value != null
          ? {
              value: storage.value,
              rawValue: diskRaw,
              confidence: "high" as const,
              status: "found" as const,
            }
          : { status: "not_found" as const, rawValue: diskRaw }),
      }),
      storageUnit: createEmptyField<string>(
        "storageUnit",
        "容量単位",
        sourceUrl,
        storage.unit
          ? {
              value: storage.unit,
              rawValue: diskRaw,
              confidence: "high",
              status: "found",
            }
          : { status: "not_found", rawValue: diskRaw },
      ),
    };
  });
}

function buildComparison(
  parsed: ParsedColorfulBox,
  sourceUrl: string,
): ScrapedComparisonValue[] {
  const ssl = findOk(parsed.okRows, ["無料SSL"]);
  const backup = findOk(parsed.okRows, ["自動バックアップ"]);
  const wp = findOk(parsed.okRows, ["簡単自動インストール"]);
  const phone = findOk(parsed.okRows, ["電話"]);
  const mail = findOk(parsed.okRows, ["メールサポート"]);
  const liteSpeed = /LiteSpeed/.test(parsed.pageText);

  const allTrue = (values: boolean[] | undefined) =>
    values && values.length > 0 ? values.every(Boolean) : null;
  const someTrue = (values: boolean[] | undefined) =>
    values && values.length > 0 ? values.some(Boolean) : null;

  return [
    {
      ...createEmptyField<boolean>("free-ssl", "無料SSL", sourceUrl, {
        value: allTrue(ssl?.values),
        rawValue: ssl?.label ?? null,
        confidence: ssl ? "high" : "low",
        status: ssl ? "found" : "not_found",
      }),
      fieldSlug: "free-ssl",
    },
    {
      ...createEmptyField<boolean>(
        "wordpress-easy-install",
        "WordPress簡単インストール",
        sourceUrl,
        {
          value: allTrue(wp?.values) ?? /WordPress/.test(parsed.pageText),
          rawValue: wp?.label ?? "WordPress",
          confidence: wp ? "high" : "medium",
          status: "found",
        },
      ),
      fieldSlug: "wordpress-easy-install",
    },
    {
      ...createEmptyField<boolean>(
        "automatic-backup",
        "自動バックアップ",
        sourceUrl,
        {
          value: allTrue(backup?.values),
          rawValue: backup?.label ?? null,
          confidence: backup ? "high" : "low",
          status: backup ? "found" : "not_found",
        },
      ),
      fieldSlug: "automatic-backup",
    },
    {
      ...createEmptyField<boolean>("litespeed", "LiteSpeed", sourceUrl, {
        value: liteSpeed ? true : null,
        rawValue: liteSpeed ? "LiteSpeed" : null,
        confidence: liteSpeed ? "medium" : "low",
        status: liteSpeed ? "found" : "not_found",
        warning: liteSpeed
          ? "公式サイトの訴求表記からの取得です。"
          : null,
        inferred: true,
      }),
      fieldSlug: "litespeed",
    },
    {
      ...createEmptyField<boolean>("phone-support", "電話サポート", sourceUrl, {
        value: someTrue(phone?.values),
        rawValue: phone?.label ?? null,
        confidence: phone ? "medium" : "low",
        status: phone ? "found" : "not_found",
        warning: "コールバック電話などプラン差がある可能性があります。",
      }),
      fieldSlug: "phone-support",
    },
    {
      ...createEmptyField<boolean>("email-support", "メールサポート", sourceUrl, {
        value: allTrue(mail?.values) ?? true,
        rawValue: mail?.label ?? "メール・チャットサポート",
        confidence: mail ? "high" : "medium",
        status: "found",
        inferred: !mail,
      }),
      fieldSlug: "email-support",
    },
    {
      ...createEmptyField<string>("storage-type", "ストレージ種別", sourceUrl, {
        value: "SSD",
        rawValue: "ディスク容量（SSD）",
        confidence: "high",
        status: "found",
      }),
      fieldSlug: "storage-type",
    },
  ];
}

async function scrapeColorfulBox(
  ctx: ScraperProviderContext,
): Promise<ScrapedServiceData> {
  assertOfficialHost(ctx.officialUrl, ALLOWED_HOSTS);
  const priceUrl = resolveOfficialPath(ctx.officialUrl, PRICE_PATH);
  const functionUrl = resolveOfficialPath(ctx.officialUrl, FUNCTION_PATH);
  const warnings: string[] = [];
  const sourceUrls: string[] = [];

  return withBrowser(async (browser) => {
    const page = await newScrapingPage(browser);
    try {
      await gotoOfficial(page, priceUrl);
      sourceUrls.push(priceUrl);
      const priceParsed = await parsePricePage(page);

      await gotoOfficial(page, functionUrl);
      sourceUrls.push(functionUrl);
      const funcParsed = await parseFunctionPage(page);

      const parsed: ParsedColorfulBox = {
        planNames: priceParsed.planNames,
        prices: priceParsed.prices,
        initialFeeRaw: priceParsed.initialFeeRaw,
        diskValues: funcParsed.diskValues,
        okRows: funcParsed.okRows,
        pageText: funcParsed.pageText,
      };

      if (parsed.planNames.length === 0) {
        throw new Error(
          "プラン名を取得できませんでした。ページ構造が変わった可能性があります。",
        );
      }

      const plans = buildPlans(parsed, priceUrl);
      const comparisonValues = buildComparison(parsed, functionUrl);
      warnings.push(
        "料金は36ヶ月契約の初回／更新月額を取得しています。比較○×は機能一覧のアイコン（class=ok）から判定しています。",
      );

      return baseResult(
        ctx,
        "colorfulbox",
        sourceUrls,
        plans,
        comparisonValues,
        warnings,
        `${parsed.pageText}\n${funcParsed.pageText}`,
      );
    } finally {
      await page.close().catch(() => undefined);
    }
  });
}

export const colorfulBoxProvider: ScraperProvider = {
  id: "colorfulbox",
  label: "ColorfulBox",
  supportedSlugs: ["colorfulbox"],
  scrape: scrapeColorfulBox,
};
