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

const ALLOWED_HOSTS = ["mixhost.jp"];
const DETAIL_PATH = "/hosting/web/";
const TARGET_PERIOD_HINT = "3年";

type MixPrice = {
  campaignTaxIncl: number | null;
  renewalTaxIncl: number | null;
  raw: string;
};

type ParsedMixhost = {
  planNames: string[];
  prices: MixPrice[];
  featureRows: Record<string, string[]>;
  pageText: string;
};

function parseMixPriceCell(raw: string): MixPrice {
  const taxIncl = [
    ...raw.matchAll(/税込\s*[¥￥]\s*([\d,]+)/g),
  ].map((m) => Number(m[1].replace(/,/g, "")));
  // 形式: 初回OFF ... 税込A / 更新：... 税込B
  return {
    campaignTaxIncl: taxIncl[0] ?? null,
    renewalTaxIncl: taxIncl[1] ?? taxIncl[0] ?? null,
    raw,
  };
}

async function parseDetailPage(page: Page): Promise<ParsedMixhost> {
  await page.waitForSelector("table", { timeout: 30_000 });
  return page.evaluate((periodHint) => {
    const tables = Array.from(document.querySelectorAll("table"));
    if (tables.length === 0) {
      throw new Error("料金・仕様テーブルが見つかりません");
    }

    const priceTable = tables[0];
    const priceRows = Array.from(priceTable.querySelectorAll("tr"));
    const header = Array.from(priceRows[0]?.querySelectorAll("th,td") ?? [])
      .slice(1)
      .map((c) => (c.textContent || "").replace(/\s+/g, " ").trim())
      .filter(Boolean);

    let targetValues: string[] = [];
    let matchedLabel = "";
    for (let r = 1; r < priceRows.length; r++) {
      const cells = Array.from(priceRows[r].querySelectorAll("th,td"));
      if (cells.length < 2) continue;
      const label = (cells[0].textContent || "").replace(/\s+/g, " ").trim();
      if (label.includes(periodHint) || label.includes("3年更新")) {
        matchedLabel = label;
        targetValues = [];
        for (let i = 1; i < cells.length; i++) {
          targetValues.push(
            (cells[i].textContent || "").replace(/\s+/g, " ").trim(),
          );
        }
        break;
      }
    }
    if (targetValues.length === 0) {
      // fallback: 1年更新
      for (let r = 1; r < priceRows.length; r++) {
        const cells = Array.from(priceRows[r].querySelectorAll("th,td"));
        const label = (cells[0].textContent || "").replace(/\s+/g, " ").trim();
        if (label.includes("1年")) {
          matchedLabel = label;
          targetValues = [];
          for (let i = 1; i < cells.length; i++) {
            targetValues.push(
              (cells[i].textContent || "").replace(/\s+/g, " ").trim(),
            );
          }
          break;
        }
      }
    }

    const featureRows: Record<string, string[]> = {};
    const featureTable = tables[1] || tables[0];
    const featureTrs = Array.from(featureTable.querySelectorAll("tr"));
    for (let r = 0; r < featureTrs.length; r++) {
      const cells = Array.from(featureTrs[r].querySelectorAll("th,td"));
      if (cells.length < 2) continue;
      const label = (cells[0].textContent || "").replace(/\s+/g, " ").trim();
      if (!label) continue;
      const values = [];
      for (let i = 1; i < cells.length; i++) {
        values.push((cells[i].textContent || "").replace(/\s+/g, " ").trim());
      }
      featureRows[label] = values;
    }

    return {
      planNames: header,
      prices: targetValues.map((raw) => ({ raw, matchedLabel })),
      featureRows,
      pageText: document.body.innerText.slice(0, 25000),
      matchedLabel,
    };
  }, TARGET_PERIOD_HINT).then((raw) => ({
    planNames: raw.planNames,
    prices: raw.prices.map((p: { raw: string }) => parseMixPriceCell(p.raw)),
    featureRows: raw.featureRows,
    pageText: raw.pageText,
  }));
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

function buildPlans(parsed: ParsedMixhost, sourceUrl: string): ScrapedPlan[] {
  const disk = findFeature(parsed.featureRows, ["ディスク容量"]);

  return parsed.planNames.map((rawName, index) => {
    const name = normalizePlanName(rawName);
    const price = parsed.prices[index];
    const diskRaw = disk?.values[index] ?? "";
    const storage = normalize.storage(diskRaw);
    // 「無制限」は数値化できない
    const unlimited = /無制限/.test(diskRaw);

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
        price?.renewalTaxIncl != null
          ? {
              value: price.renewalTaxIncl,
              rawValue: price.raw,
              sourceText: `更新（税込）: ${price.raw}`,
              confidence: "high",
              status: "found",
              warning: "更新後の税込月額を通常月額として取得しています。",
            }
          : { status: "not_found" },
      ),
      campaignMonthlyPrice: createEmptyField<number>(
        "campaignMonthlyPrice",
        "キャンペーン月額",
        sourceUrl,
        price?.campaignTaxIncl != null
          ? {
              value: price.campaignTaxIncl,
              rawValue: price.raw,
              sourceText: `初回（税込）: ${price.raw}`,
              confidence: "medium",
              status: "found",
              warning: "初回割引の税込月額です。適用条件・期間を確認してください。",
            }
          : { status: "not_found" },
      ),
      effectiveMonthlyPrice: createEmptyField<number>(
        "effectiveMonthlyPrice",
        "実質月額",
        sourceUrl,
        {
          value: price?.campaignTaxIncl ?? null,
          rawValue: price?.raw ?? null,
          confidence: "medium",
          status: "ambiguous",
          warning: "初回価格を実質候補として保持しています。自動反映しません。",
          inferred: true,
        },
      ),
      initialFee: createEmptyField<number>("initialFee", "初期費用", sourceUrl, {
        value: 0,
        rawValue: "初期費用の明示なし（0円扱い）",
        confidence: "medium",
        status: "found",
        warning: "料金表に初期費用行がないため0円として記録しています。",
        inferred: true,
      }),
      billingPeriod: createEmptyField<string>(
        "billingPeriod",
        "契約期間",
        sourceUrl,
        {
          value: "36ヶ月",
          rawValue: "3年更新",
          confidence: "medium",
          status: "found",
          warning: "代表値として3年更新行を採用しています。",
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
          : {
              status: "not_found" as const,
              rawValue: diskRaw,
              warning: unlimited
                ? "公式表記が『無制限』のため数値化していません。"
                : "容量を数値化できませんでした。",
            }),
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
          : unlimited
            ? {
                value: null,
                rawValue: diskRaw,
                status: "ambiguous",
                warning: "無制限表記のため単位のみでは確定できません。",
              }
            : { status: "not_found", rawValue: diskRaw },
      ),
    };
  });
}

function allYes(values: string[] | undefined): boolean | null {
  if (!values || values.length === 0) return null;
  const marks = values.map(markFromCellText);
  if (marks.every((m) => m === true)) return true;
  if (marks.every((m) => m === false)) return false;
  if (marks.some((m) => m === true)) return true;
  return null;
}

function buildComparison(
  parsed: ParsedMixhost,
  sourceUrl: string,
): ScrapedComparisonValue[] {
  const ssl = findFeature(parsed.featureRows, ["無料SSL"]);
  const backup = findFeature(parsed.featureRows, ["自動バックアップ"]);
  const wp = findFeature(parsed.featureRows, ["WordPressクイックインストール"]);
  const lite = findFeature(parsed.featureRows, ["LiteSpeed"]);
  const support = findFeature(parsed.featureRows, ["WordPressに関するサポート"]);

  const retentionMatch = (backup?.values.join(" ") ?? "").match(/(\d+)\s*日/);
  const retentionDays = retentionMatch ? Number(retentionMatch[1]) : null;
  const backupYes =
    backup?.values.some((v) => /\d+\s*日|○|〇/.test(v) && !/^×$/.test(v.trim())) ??
    null;

  return [
    {
      ...createEmptyField<boolean>("free-ssl", "無料SSL", sourceUrl, {
        value: allYes(ssl?.values),
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
          value: allYes(wp?.values),
          rawValue: wp?.label ?? null,
          confidence: wp ? "high" : "low",
          status: wp ? "found" : "not_found",
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
          rawValue: backup?.values.join(" / ") ?? null,
          confidence: backupYes != null ? "high" : "low",
          status: backupYes != null ? "found" : "not_found",
          warning: "ライトプランは自動バックアップ対象外です。",
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
      ...createEmptyField<boolean>("litespeed", "LiteSpeed", sourceUrl, {
        value: allYes(lite?.values) ?? /LiteSpeed/.test(parsed.pageText),
        rawValue: lite?.label ?? "LiteSpeed Cache",
        confidence: lite ? "high" : "medium",
        status: "found",
      }),
      fieldSlug: "litespeed",
    },
    {
      ...createEmptyField<boolean>("email-support", "メールサポート", sourceUrl, {
        value: support ? true : /メール/.test(parsed.pageText),
        rawValue: support?.label ?? null,
        confidence: "medium",
        status: "found",
        warning: "メール／チャット中心。電話サポートの明示は弱いです。",
        inferred: true,
      }),
      fieldSlug: "email-support",
    },
    {
      ...createEmptyField<string>("storage-type", "ストレージ種別", sourceUrl, {
        value: "NVMe SSD",
        rawValue: "NVMe SSD",
        confidence: "medium",
        status: "found",
        warning: "トップページの訴求表記からの取得です。",
        inferred: true,
      }),
      fieldSlug: "storage-type",
    },
  ];
}

async function scrapeMixhost(
  ctx: ScraperProviderContext,
): Promise<ScrapedServiceData> {
  assertOfficialHost(ctx.officialUrl, ALLOWED_HOSTS);
  const detailUrl = resolveOfficialPath(ctx.officialUrl, DETAIL_PATH);
  const warnings: string[] = [];
  const sourceUrls: string[] = [];

  return withBrowser(async (browser) => {
    const page = await newScrapingPage(browser);
    try {
      await gotoOfficial(page, detailUrl);
      sourceUrls.push(detailUrl);
      const parsed = await parseDetailPage(page);
      if (parsed.planNames.length === 0) {
        throw new Error(
          "プラン名を取得できませんでした。ページ構造が変わった可能性があります。",
        );
      }
      const plans = buildPlans(parsed, detailUrl);
      const comparisonValues = buildComparison(parsed, detailUrl);
      warnings.push(
        "料金は3年更新行の税込価格（初回／更新）を取得しています。ディスク『無制限』は数値化していません。",
      );
      return baseResult(
        ctx,
        "mixhost",
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

export const mixhostProvider: ScraperProvider = {
  id: "mixhost",
  label: "mixhost",
  supportedSlugs: ["mixhost"],
  scrape: scrapeMixhost,
};
