import type { Page } from "playwright";
import { normalize } from "@/lib/scraping/normalize";
import { baseResult, markFromCellText } from "@/lib/scraping/providers/helpers";
import {
  assertOfficialHost,
  gotoOfficial,
  newScrapingPage,
  resolveOfficialPath,
  withBrowser,
} from "@/lib/scraping/utils/browser";
import {
  normalizePlanName,
  slugifyJaPlanName,
} from "@/lib/scraping/utils/text";
import {
  createEmptyField,
  type ScrapedComparisonValue,
  type ScrapedPlan,
  type ScrapedServiceData,
  type ScraperProvider,
  type ScraperProviderContext,
} from "@/lib/scraping/types";

const ALLOWED_HOSTS = ["shin-server.jp"];
const PRICE_PATH = "/service/price.php";
const FUNCTIONS_PATH = "/service/functions.php";
const TARGET_PERIOD = "36ヶ月";

type DualPrice = {
  regular: number | null;
  campaign: number | null;
  raw: string;
};

type ParsedShin = {
  planNames: string[];
  prices: DualPrice[];
  initialFees: (number | null)[];
  diskValues: string[];
  comparisonRows: Record<string, string[]>;
  pageText: string;
};

async function parsePriceTable(page: Page): Promise<{
  planNames: string[];
  prices: DualPrice[];
}> {
  await page.waitForSelector("table", { state: "attached", timeout: 30_000 });
  return page.evaluate((periodLabel) => {
    const tables = Array.from(document.querySelectorAll("table"));
    for (let ti = 0; ti < tables.length; ti++) {
      const table = tables[ti];
      const rows = Array.from(table.querySelectorAll("tr"));
      if (rows.length < 2) continue;
      const header = Array.from(rows[0].querySelectorAll("th,td")).map((c) =>
        (c.textContent || "").replace(/\s+/g, " ").trim(),
      );
      if (!header.some((h) => h.includes("ベーシック"))) continue;

      const planNames = header.slice(1).filter(Boolean);
      let targetRow: Element | null = null;
      for (let r = 1; r < rows.length; r++) {
        const label = (rows[r].querySelector("th,td")?.textContent || "")
          .replace(/\s+/g, "")
          .trim();
        if (label.includes(periodLabel.replace("ヶ月", "")) || label === periodLabel) {
          targetRow = rows[r];
          break;
        }
      }
      if (!targetRow) continue;

      const cells = Array.from(targetRow.querySelectorAll("th,td")).slice(1);
      const prices = [];
      for (let ci = 0; ci < cells.length; ci++) {
        const cell = cells[ci];
        const struck = cell.querySelector("s");
        const red =
          cell.querySelector(".colorRed, .fontBold.colorRed, span.colorRed") ||
          cell.querySelector("span");
        const regularText = struck
          ? (struck.textContent || "").replace(/\s+/g, " ").trim()
          : "";
        const campaignText = red
          ? (red.textContent || "").replace(/\s+/g, " ").trim()
          : (cell.textContent || "").replace(/\s+/g, " ").trim();
        const raw = (cell.textContent || "").replace(/\s+/g, " ").trim();
        const regularMatch = (regularText || (struck ? "" : raw))
          .replace(/,/g, "")
          .match(/(\d+)\s*円/);
        const campaignMatch = campaignText.replace(/,/g, "").match(/(\d+)\s*円/);
        prices.push({
          regular: regularMatch ? Number(regularMatch[1]) : null,
          campaign: struck && campaignMatch ? Number(campaignMatch[1]) : null,
          raw,
        });
      }

      if (planNames.length > 0 && prices.length > 0) {
        return { planNames, prices };
      }
    }
    throw new Error("シンレンタルサーバーの料金表が見つかりません");
  }, TARGET_PERIOD);
}

async function parseFunctionsPage(page: Page): Promise<{
  initialFees: (number | null)[];
  diskValues: string[];
  comparisonRows: Record<string, string[]>;
  pageText: string;
}> {
  await page.waitForSelector("table", { state: "attached", timeout: 30_000 });
  return page.evaluate(() => {
    const comparisonRows: Record<string, string[]> = {};
    const rows = Array.from(document.querySelectorAll("table tr"));
    for (let r = 0; r < rows.length; r++) {
      const cells = Array.from(rows[r].querySelectorAll("th,td"));
      if (cells.length < 2) continue;
      const label = (cells[0].textContent || "").replace(/\s+/g, " ").trim();
      if (!label) continue;
      const values = [];
      for (let i = 1; i < cells.length; i++) {
        values.push((cells[i].textContent || "").replace(/\s+/g, " ").trim());
      }
      comparisonRows[label] = values;
    }

    let initialRaw: string[] = [];
    let diskValues: string[] = [];
    for (const [label, values] of Object.entries(comparisonRows)) {
      if (label.includes("初期費用") && initialRaw.length === 0) {
        initialRaw = values;
      }
      if (label.includes("ディスク") && diskValues.length === 0) {
        diskValues = values;
      }
    }

    const initialFees = [];
    for (let i = 0; i < initialRaw.length; i++) {
      const t = initialRaw[i];
      if (/無料|0円/.test(t)) {
        initialFees.push(0);
      } else {
        const m = t.replace(/,/g, "").match(/(\d+)\s*円/);
        initialFees.push(m ? Number(m[1]) : null);
      }
    }

    return {
      initialFees,
      diskValues,
      comparisonRows,
      pageText: document.body.innerText.slice(0, 25000),
    };
  });
}

function findRowValues(
  rows: Record<string, string[]>,
  keywords: string[],
): { label: string; values: string[] } | null {
  for (const [label, values] of Object.entries(rows)) {
    if (keywords.every((k) => label.includes(k))) {
      return { label, values };
    }
  }
  for (const [label, values] of Object.entries(rows)) {
    if (keywords.some((k) => label.includes(k))) {
      return { label, values };
    }
  }
  return null;
}

function buildPlans(parsed: ParsedShin, sourceUrl: string): ScrapedPlan[] {
  return parsed.planNames.map((rawName, index) => {
    const name = normalizePlanName(rawName);
    const price = parsed.prices[index];
    const diskRaw = parsed.diskValues[index] ?? "";
    const storage = normalize.storage(diskRaw);
    const initial = parsed.initialFees[index] ?? parsed.initialFees[0] ?? null;

    return {
      name: createEmptyField<string>("name", "プラン名", sourceUrl, {
        value: name,
        rawValue: rawName,
        confidence: "high",
        status: "found",
      }),
      slugHint: slugifyJaPlanName(name),
      regularMonthlyPrice: createEmptyField<number>(
        "regularMonthlyPrice",
        "通常月額",
        sourceUrl,
        price?.regular != null
          ? {
              value: price.regular,
              rawValue: price.raw,
              sourceText: `${TARGET_PERIOD}: ${price.raw}`,
              confidence: "high",
              status: "found",
            }
          : {
              status: "not_found",
              warning: "通常月額を取得できませんでした。",
            },
      ),
      campaignMonthlyPrice: createEmptyField<number>(
        "campaignMonthlyPrice",
        "キャンペーン月額",
        sourceUrl,
        price?.campaign != null
          ? {
              value: price.campaign,
              rawValue: price.raw,
              sourceText: `${TARGET_PERIOD}: ${price.raw}`,
              confidence: "medium",
              status: "found",
              warning: "赤字表示のキャンペーン価格です。適用期間外は変動します。",
            }
          : {
              status: "not_found",
              rawValue: price?.raw ?? null,
            },
      ),
      effectiveMonthlyPrice: createEmptyField<number>(
        "effectiveMonthlyPrice",
        "実質月額",
        sourceUrl,
        price?.campaign != null
          ? {
              value: price.campaign,
              rawValue: price.raw,
              confidence: "medium",
              status: "ambiguous",
              warning:
                "キャンペーン価格を実質月額候補として保持しています。自動反映しません。",
              inferred: true,
            }
          : { status: "not_found" },
      ),
      initialFee: createEmptyField<number>("initialFee", "初期費用", sourceUrl, {
        value: initial ?? 0,
        rawValue: initial != null ? `${initial}円` : "0円",
        confidence: "high",
        status: "found",
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
          warning: "代表値として36ヶ月契約を採用しています。",
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
  parsed: ParsedShin,
  sourceUrl: string,
): ScrapedComparisonValue[] {
  const ssl = findRowValues(parsed.comparisonRows, ["無料", "SSL"]) ??
    findRowValues(parsed.comparisonRows, ["SSL"]);
  const backup = findRowValues(parsed.comparisonRows, ["自動バックアップ"]);
  const wp = findRowValues(parsed.comparisonRows, [
    "WordPress簡単インストール",
  ]);
  const phone = findRowValues(parsed.comparisonRows, ["電話サポート"]);
  const mail = findRowValues(parsed.comparisonRows, ["メールサポート"]);
  const disk = findRowValues(parsed.comparisonRows, ["ディスク"]);

  const sslYes = ssl
    ? ssl.values.every((v) => /無料|○|〇/.test(v))
      ? true
      : markFromCellText(ssl.values[0] ?? "")
    : null;
  const backupYes = backup
    ? backup.values.every((v) => markFromCellText(v) !== false)
    : null;
  const wpYes = wp
    ? wp.values.every((v) => markFromCellText(v) === true)
    : null;
  const phoneYes = phone
    ? phone.values.every((v) => markFromCellText(v) === true)
    : /電話サポート/.test(parsed.pageText);
  const mailYes = mail
    ? mail.values.every((v) => markFromCellText(v) === true)
    : /メールサポート/.test(parsed.pageText)
      ? true
      : null;

  const retentionMatch = (backup?.label ?? parsed.pageText).match(
    /過去\s*(\d+)\s*日/,
  );
  const retentionDays = retentionMatch ? Number(retentionMatch[1]) : null;
  const storageHint = disk
    ? normalize.storage(disk.values[0] ?? "").mediaHint
    : null;

  return [
    {
      ...createEmptyField<boolean>("free-ssl", "無料SSL", sourceUrl, {
        value: sslYes,
        rawValue: ssl?.label ?? null,
        confidence: sslYes != null ? "high" : "low",
        status: sslYes != null ? "found" : "not_found",
      }),
      fieldSlug: "free-ssl",
    },
    {
      ...createEmptyField<boolean>(
        "wordpress-easy-install",
        "WordPress簡単インストール",
        sourceUrl,
        {
          value: wpYes,
          rawValue: wp?.label ?? null,
          confidence: wpYes ? "high" : "low",
          status: wpYes != null ? "found" : "not_found",
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
          value: backupYes,
          rawValue: backup?.label ?? null,
          confidence: backupYes != null ? "high" : "low",
          status: backupYes != null ? "found" : "not_found",
        },
      ),
      fieldSlug: "automatic-backup",
    },
    {
      ...createEmptyField<number>(
        "backup-retention-days",
        "バックアップ保持日数",
        sourceUrl,
        {
          value: retentionDays,
          rawValue: retentionMatch?.[0] ?? null,
          confidence: retentionDays != null ? "high" : "low",
          status: retentionDays != null ? "found" : "not_found",
        },
      ),
      fieldSlug: "backup-retention-days",
    },
    {
      ...createEmptyField<boolean>("phone-support", "電話サポート", sourceUrl, {
        value: phoneYes ? true : null,
        rawValue: phone?.label ?? null,
        confidence: phoneYes ? "high" : "low",
        status: phoneYes ? "found" : "not_found",
      }),
      fieldSlug: "phone-support",
    },
    {
      ...createEmptyField<boolean>("email-support", "メールサポート", sourceUrl, {
        value: mailYes,
        rawValue: mail?.label ?? null,
        confidence: mailYes != null ? "high" : "low",
        status: mailYes != null ? "found" : "not_found",
      }),
      fieldSlug: "email-support",
    },
    {
      ...createEmptyField<string>("storage-type", "ストレージ種別", sourceUrl, {
        value: storageHint ?? "SSD",
        rawValue: disk?.values.join(" / ") ?? null,
        confidence: "high",
        status: "found",
      }),
      fieldSlug: "storage-type",
    },
  ];
}

async function scrapeShinServer(
  ctx: ScraperProviderContext,
): Promise<ScrapedServiceData> {
  assertOfficialHost(ctx.officialUrl, ALLOWED_HOSTS);
  const priceUrl = resolveOfficialPath(ctx.officialUrl, PRICE_PATH);
  const functionsUrl = resolveOfficialPath(ctx.officialUrl, FUNCTIONS_PATH);
  const warnings: string[] = [];
  const sourceUrls: string[] = [];

  return withBrowser(async (browser) => {
    const page = await newScrapingPage(browser);
    try {
      await gotoOfficial(page, priceUrl);
      sourceUrls.push(priceUrl);
      const priceParsed = await parsePriceTable(page);

      await gotoOfficial(page, functionsUrl);
      sourceUrls.push(functionsUrl);
      const funcParsed = await parseFunctionsPage(page);

      const parsed: ParsedShin = {
        planNames: priceParsed.planNames,
        prices: priceParsed.prices,
        initialFees: funcParsed.initialFees,
        diskValues: funcParsed.diskValues,
        comparisonRows: funcParsed.comparisonRows,
        pageText: funcParsed.pageText,
      };

      if (parsed.planNames.length === 0) {
        throw new Error(
          "プラン名を取得できませんでした。ページ構造が変わった可能性があります。",
        );
      }

      const plans = buildPlans(parsed, priceUrl);
      const comparisonValues = buildComparison(parsed, functionsUrl);
      warnings.push(
        "料金は36ヶ月契約の表示を代表値として取得しています。キャンペーン価格は適用期間を公式で確認してください。",
      );

      return baseResult(
        ctx,
        "shin-server",
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

export const shinServerProvider: ScraperProvider = {
  id: "shin-server",
  label: "シンレンタルサーバー",
  supportedSlugs: ["shin-server"],
  scrape: scrapeShinServer,
};
