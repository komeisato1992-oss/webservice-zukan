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

const ALLOWED_HOSTS = ["lolipop.jp"];
const PRICE_PATH = "/pricing/";
const TARGET_PERIOD = "36ヶ月";

type ParsedLolipop = {
  planNames: string[];
  priceByPeriod: Record<string, string[]>;
  initialFees: string[];
  featureRows: Record<string, string[]>;
  pageText: string;
};

async function parsePricingPage(page: Page): Promise<ParsedLolipop> {
  await page.waitForSelector("table", { timeout: 30_000 });
  return page.evaluate(() => {
    const tables = Array.from(document.querySelectorAll("table"));
    if (tables.length === 0) {
      throw new Error("料金表テーブルが見つかりません");
    }

    const priceTable = tables[0];
    const priceRows = Array.from(priceTable.querySelectorAll("tr"));
    const header = Array.from(priceRows[0]?.querySelectorAll("th,td") ?? [])
      .slice(1)
      .map((c) => (c.textContent || "").replace(/\s+/g, " ").trim())
      .filter(Boolean);

    const priceByPeriod: Record<string, string[]> = {};
    const initialFees: string[] = [];
    for (let r = 1; r < priceRows.length; r++) {
      const cells = Array.from(priceRows[r].querySelectorAll("th,td"));
      if (cells.length < 2) continue;
      const label = (cells[0].textContent || "").replace(/\s+/g, " ").trim();
      const values = [];
      for (let i = 1; i < cells.length; i++) {
        values.push((cells[i].textContent || "").replace(/\s+/g, " ").trim());
      }
      if (label.includes("初期費用")) {
        for (let i = 0; i < values.length; i++) initialFees.push(values[i]);
        continue;
      }
      if (/\d+\s*ヶ月/.test(label) || label === "1ヶ月") {
        priceByPeriod[label.replace(/\s+/g, "")] = values;
      }
    }

    const featureRows: Record<string, string[]> = {};
    for (let ti = 1; ti < tables.length; ti++) {
      const rows = Array.from(tables[ti].querySelectorAll("tr"));
      for (let r = 0; r < rows.length; r++) {
        const cells = Array.from(rows[r].querySelectorAll("th,td"));
        if (cells.length < 2) continue;
        const label = (cells[0].textContent || "").replace(/\s+/g, " ").trim();
        if (!label || label.length > 120) continue;
        const values = [];
        for (let i = 1; i < cells.length; i++) {
          const el = cells[i];
          let text = (el.textContent || "").replace(/\s+/g, " ").trim();
          // Material icon checkmarks often render as private-use glyphs
          if (!text || /^[\uE000-\uF8FF]+$/.test(text)) {
            const hasIcon = el.querySelector(
              "[class*='check'], [class*='done'], svg, i",
            );
            if (hasIcon || el.querySelector("img[alt*='対応'], img[alt*='あり']")) {
              text = "○";
            }
          }
          values.push(text);
        }
        featureRows[label] = values;
      }
    }

    return {
      planNames: header,
      priceByPeriod,
      initialFees,
      featureRows,
      pageText: document.body.innerText.slice(0, 25000),
    };
  });
}

function findFeature(
  rows: Record<string, string[]>,
  keywords: string[],
): { label: string; values: string[] } | null {
  for (const [label, values] of Object.entries(rows)) {
    if (keywords.every((k) => label.includes(k))) return { label, values };
  }
  for (const [label, values] of Object.entries(rows)) {
    if (keywords.some((k) => label.includes(k))) return { label, values };
  }
  return null;
}

function periodValues(parsed: ParsedLolipop): {
  key: string;
  values: string[];
} | null {
  const keys = Object.keys(parsed.priceByPeriod);
  const key =
    keys.find((k) => k.includes("36")) ??
    keys.find((k) => k.includes("24")) ??
    keys.find((k) => k.includes("12")) ??
    null;
  if (!key) return null;
  return { key, values: parsed.priceByPeriod[key] };
}

function buildPlans(parsed: ParsedLolipop, sourceUrl: string): ScrapedPlan[] {
  const period = periodValues(parsed);
  const disk = findFeature(parsed.featureRows, ["容量（SSD）"]) ??
    findFeature(parsed.featureRows, ["容量"]);

  return parsed.planNames.map((rawName, index) => {
    const name = normalizePlanName(rawName);
    const priceRaw = period?.values[index] ?? "";
    const yen = normalize.yen(priceRaw);
    const diskRaw = disk?.values[index] ?? "";
    const storage = normalize.storage(diskRaw);
    const initialRaw = parsed.initialFees[index] ?? "0円";
    const initial = /無料|0円/.test(initialRaw)
      ? 0
      : (normalize.yen(initialRaw) ?? 0);

    // カード側にキャンペーンっぽい「〜円/月〜」があるが、表の36ヶ月を通常月額とする
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
        yen != null
          ? {
              value: yen,
              rawValue: priceRaw,
              sourceText: period ? `${period.key}: ${priceRaw}` : priceRaw,
              confidence: "high",
              status: "found",
            }
          : {
              status: "not_found",
              warning: "月額料金を取得できませんでした。",
            },
      ),
      campaignMonthlyPrice: createEmptyField<number>(
        "campaignMonthlyPrice",
        "キャンペーン月額",
        sourceUrl,
        {
          value: null,
          rawValue: priceRaw,
          confidence: "low",
          status: "ambiguous",
          warning:
            "料金表の長期割引と期間限定キャンペーンの区別がつきにくいため、自動反映しません。",
        },
      ),
      effectiveMonthlyPrice: createEmptyField<number>(
        "effectiveMonthlyPrice",
        "実質月額",
        sourceUrl,
        {
          status: "not_found",
          warning: "実質月額の明示表記はありません。",
        },
      ),
      initialFee: createEmptyField<number>("initialFee", "初期費用", sourceUrl, {
        value: initial,
        rawValue: initialRaw,
        confidence: "high",
        status: "found",
      }),
      billingPeriod: createEmptyField<string>(
        "billingPeriod",
        "契約期間",
        sourceUrl,
        {
          value: normalize.billingPeriod(period?.key) ?? TARGET_PERIOD,
          rawValue: period?.key ?? TARGET_PERIOD,
          confidence: "medium",
          status: period ? "found" : "not_found",
          warning: "代表として最長契約期間の月額を採用しています。",
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

function cellBool(values: string[] | undefined): boolean | null {
  if (!values || values.length === 0) return null;
  const marks = values.map(markFromCellText);
  if (marks.every((m) => m === true)) return true;
  if (marks.every((m) => m === false)) return false;
  if (marks.some((m) => m === true)) return true;
  return null;
}

function buildComparison(
  parsed: ParsedLolipop,
  sourceUrl: string,
): ScrapedComparisonValue[] {
  const ssl =
    findFeature(parsed.featureRows, ["独自ドメインのSSL"]) ??
    findFeature(parsed.featureRows, ["SSL"]);
  const backup = findFeature(parsed.featureRows, ["自動バックアップ"]);
  const wp = findFeature(parsed.featureRows, ["WordPress"]);
  const phone = findFeature(parsed.featureRows, ["電話サポート"]);
  const mail = findFeature(parsed.featureRows, ["メールサポート"]);
  const storageType = findFeature(parsed.featureRows, ["ストレージ"]);

  const backupValues = backup?.values ?? [];
  const autoBackup =
    backupValues.length > 0
      ? backupValues.some((v) => /無料|○|〇/.test(v) && !/^-$/.test(v.trim()))
      : null;

  return [
    {
      ...createEmptyField<boolean>("free-ssl", "無料SSL", sourceUrl, {
        value: cellBool(ssl?.values) ?? true,
        rawValue: ssl?.label ?? null,
        confidence: ssl ? "high" : "medium",
        status: "found",
        warning: ssl ? null : "SSL行の明示が弱いため要確認です。",
        inferred: !ssl,
      }),
      fieldSlug: "free-ssl",
    },
    {
      ...createEmptyField<boolean>(
        "wordpress-easy-install",
        "WordPress簡単インストール",
        sourceUrl,
        {
          value: cellBool(wp?.values),
          rawValue: wp?.label ?? null,
          confidence: "medium",
          status: wp ? "found" : "not_found",
          warning: "プランによりWordPress非対応（エコノミー等）があります。",
          inferred: true,
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
          value: autoBackup,
          rawValue: backup?.values.join(" / ") ?? null,
          confidence: autoBackup != null ? "medium" : "low",
          status: autoBackup != null ? "found" : "not_found",
          warning:
            "ハイスピード／エンタープライズ以外は有料オプションの可能性があります。",
        },
      ),
      fieldSlug: "automatic-backup",
    },
    {
      ...createEmptyField<boolean>("phone-support", "電話サポート", sourceUrl, {
        value: cellBool(phone?.values),
        rawValue: phone?.values.join(" / ") ?? null,
        confidence: phone ? "high" : "low",
        status: phone ? "found" : "not_found",
        warning: "スタンダード以上で電話サポートあり、下位プランはなしです。",
      }),
      fieldSlug: "phone-support",
    },
    {
      ...createEmptyField<boolean>("email-support", "メールサポート", sourceUrl, {
        value: mail ? true : /メールサポート/.test(parsed.pageText),
        rawValue: mail?.values.join(" / ") ?? null,
        confidence: mail ? "high" : "medium",
        status: "found",
      }),
      fieldSlug: "email-support",
    },
    {
      ...createEmptyField<string>("storage-type", "ストレージ種別", sourceUrl, {
        value: "SSD",
        rawValue: storageType?.values.join(" / ") ?? "SSD",
        confidence: "high",
        status: "found",
      }),
      fieldSlug: "storage-type",
    },
  ];
}

async function scrapeLolipop(
  ctx: ScraperProviderContext,
): Promise<ScrapedServiceData> {
  assertOfficialHost(ctx.officialUrl, ALLOWED_HOSTS);
  const priceUrl = resolveOfficialPath(ctx.officialUrl, PRICE_PATH);
  const warnings: string[] = [];
  const sourceUrls: string[] = [];

  return withBrowser(async (browser) => {
    const page = await newScrapingPage(browser);
    try {
      await gotoOfficial(page, priceUrl);
      sourceUrls.push(priceUrl);
      const parsed = await parsePricingPage(page);
      if (parsed.planNames.length === 0) {
        throw new Error(
          "プラン名を取得できませんでした。ページ構造が変わった可能性があります。",
        );
      }
      const plans = buildPlans(parsed, priceUrl);
      const comparisonValues = buildComparison(parsed, priceUrl);
      warnings.push(
        "料金は料金表の長期契約（主に36ヶ月）行を代表値として取得しています。",
      );
      return baseResult(
        ctx,
        "lolipop",
        sourceUrls,
        plans,
        comparisonValues,
        warnings,
        parsed.pageText,
      );
    } finally {
      await page.close().catch(() => undefined);
    }
  });
}

export const lolipopProvider: ScraperProvider = {
  id: "lolipop",
  label: "ロリポップ！",
  supportedSlugs: ["lolipop"],
  scrape: scrapeLolipop,
};
