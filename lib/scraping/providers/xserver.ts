import type { Page } from "playwright";
import { normalize } from "@/lib/scraping/normalize";
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

const ALLOWED_HOSTS = ["xserver.ne.jp"];
const PRICE_PATH = "/price/";

type TableCell = {
  text: string;
  hasYes: boolean;
  hasNo: boolean;
};

type ParsedPricePage = {
  planNames: string[];
  comparisonRows: Record<string, TableCell[]>;
  priceRows: Record<string, string[]>;
  initialFees: string[];
  pageText: string;
};

async function parsePricePage(page: Page): Promise<ParsedPricePage> {
  await page.waitForSelector("table", { timeout: 30_000 });

  // page.evaluate 内にネスト関数を置かない（tsx/esbuild の __name 注入対策）
  return page.evaluate(() => {
    const tables = Array.from(document.querySelectorAll("table"));
    if (tables.length < 2) {
      throw new Error("料金表テーブルが見つかりません");
    }

    const comparison = tables[0];
    const price = tables[1];

    const compRows = Array.from(comparison.querySelectorAll("tr"));
    const headerCells = Array.from(
      compRows[0]?.querySelectorAll("th,td") ?? [],
    ).slice(1);
    const planNames = headerCells.map((c) =>
      (c.textContent || "")
        .replace(/\s+/g, " ")
        .replace(/おすすめプラン/g, "")
        .trim(),
    );

    const comparisonRows: Record<
      string,
      { text: string; hasYes: boolean; hasNo: boolean }[]
    > = {};

    for (let r = 1; r < compRows.length; r++) {
      const cells = Array.from(compRows[r].querySelectorAll("th,td"));
      if (cells.length < 2) continue;
      const label = (cells[0].textContent || "").replace(/\s+/g, " ").trim();
      if (!label) continue;
      const parsedCells = [];
      for (let i = 1; i < cells.length; i++) {
        const el = cells[i];
        const text = (el.textContent || "").replace(/\s+/g, " ").trim();
        const imgs = Array.from(el.querySelectorAll("img"));
        const alts = imgs.map((img) => (img.getAttribute("alt") || "").trim());
        let hasYes = false;
        let hasNo = text === "×";
        for (let a = 0; a < alts.length; a++) {
          if (alts[a] === "あり" || alts[a] === "○" || alts[a] === "対応") {
            hasYes = true;
          }
          if (alts[a] === "なし" || alts[a] === "×" || alts[a] === "非対応") {
            hasNo = true;
          }
        }
        parsedCells.push({ text, hasYes, hasNo });
      }
      comparisonRows[label] = parsedCells;
    }

    const priceRows: Record<string, string[]> = {};
    const initialFees: string[] = [];
    const priceTrs = Array.from(price.querySelectorAll("tr"));
    for (let r = 0; r < priceTrs.length; r++) {
      const cells = Array.from(priceTrs[r].querySelectorAll("th,td"));
      if (cells.length < 2) continue;
      const label = (cells[0].textContent || "").replace(/\s+/g, " ").trim();
      const values = [];
      for (let i = 1; i < cells.length; i++) {
        values.push(
          (cells[i].textContent || "").replace(/\s+/g, " ").trim(),
        );
      }
      if (label.includes("初期費用")) {
        for (let i = 0; i < values.length; i++) initialFees.push(values[i]);
      }
      if (/^\d+ヶ月$/.test(label) || label.includes("ヶ月")) {
        priceRows[label] = values;
      }
    }

    return {
      planNames,
      comparisonRows,
      priceRows,
      initialFees,
      pageText: document.body.innerText.slice(0, 20000),
    };
  });
}

function findRow(
  rows: Record<string, TableCell[]>,
  keywords: string[],
): { label: string; cells: TableCell[] } | null {
  for (const [label, cells] of Object.entries(rows)) {
    if (keywords.every((k) => label.includes(k))) {
      return { label, cells };
    }
  }
  for (const [label, cells] of Object.entries(rows)) {
    if (keywords.some((k) => label.includes(k))) {
      return { label, cells };
    }
  }
  return null;
}

function buildPlans(
  parsed: ParsedPricePage,
  sourceUrl: string,
): ScrapedPlan[] {
  const periodKey =
    Object.keys(parsed.priceRows).find((k) => k.startsWith("36")) ??
    Object.keys(parsed.priceRows).find((k) => k.includes("36ヶ月"));

  const periodValues = periodKey ? parsed.priceRows[periodKey] : null;
  const diskRow = findRow(parsed.comparisonRows, ["ディスク"]);
  const initialRaw = parsed.initialFees[0] ?? "0円";

  return parsed.planNames.map((rawName, index) => {
    const name = normalizePlanName(rawName);
    const priceRaw = periodValues?.[index] ?? "";
    const split = normalize.splitPrice(priceRaw);
    const diskRaw = diskRow?.cells[index]?.text ?? "";
    const storage = normalize.storage(diskRaw);

    const nameField = createEmptyField<string>("name", "プラン名", sourceUrl, {
      value: name,
      rawValue: rawName,
      sourceText: rawName,
      confidence: "high",
      status: "found",
    });

    const regular = createEmptyField<number>(
      "regularMonthlyPrice",
      "通常月額",
      sourceUrl,
      split.regular != null
        ? {
            value: split.regular,
            rawValue: priceRaw,
            sourceText: periodKey ? `${periodKey}: ${priceRaw}` : priceRaw,
            confidence: "high",
            status: "found",
          }
        : {
            status: "not_found",
            warning: "36ヶ月の通常月額を取得できませんでした。",
          },
    );

    // キャッシュバック実質価格はキャンペーン月額と混同しやすいため ambiguous
    const campaign = createEmptyField<number>(
      "campaignMonthlyPrice",
      "キャンペーン月額",
      sourceUrl,
      {
        value: null,
        rawValue: priceRaw,
        sourceText: priceRaw,
        confidence: "low",
        status: "ambiguous",
        warning:
          "キャッシュバック後の実質価格とキャンペーン月額の区別ができないため自動反映しません。",
      },
    );

    const effective = createEmptyField<number>(
      "effectiveMonthlyPrice",
      "実質月額",
      sourceUrl,
      split.effective != null
        ? {
            value: split.effective,
            rawValue: priceRaw,
            sourceText: priceRaw,
            confidence: "medium",
            status: "ambiguous",
            warning:
              "表示はキャッシュバック後の実質価格の可能性があり、通常の割引月額と異なる場合があります。",
            inferred: true,
          }
        : {
            status: "not_found",
            warning: "実質月額を特定できませんでした。",
          },
    );

    const initialFee = createEmptyField<number>(
      "initialFee",
      "初期費用",
      sourceUrl,
      {
        value: normalize.yen(initialRaw) ?? 0,
        rawValue: initialRaw,
        sourceText: initialRaw,
        confidence: "high",
        status: "found",
      },
    );

    const billingPeriod = createEmptyField<string>(
      "billingPeriod",
      "契約期間",
      sourceUrl,
      {
        value: "36ヶ月",
        rawValue: periodKey ?? "36ヶ月",
        sourceText:
          "料金表の最長契約（36ヶ月）行を代表値として取得しています。",
        confidence: "medium",
        status: periodKey ? "found" : "not_found",
        warning: periodKey
          ? "契約期間は複数あるため、代表として36ヶ月を採用しています。"
          : "契約期間行が見つかりませんでした。",
        inferred: true,
      },
    );

    const storageValue = createEmptyField<number>(
      "storageValue",
      "容量",
      sourceUrl,
      storage.value != null
        ? {
            value: storage.value,
            rawValue: diskRaw,
            sourceText: diskRow ? `${diskRow.label}: ${diskRaw}` : diskRaw,
            confidence: "high",
            status: "found",
          }
        : { status: "not_found", rawValue: diskRaw },
    );

    const storageUnit = createEmptyField<string>(
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
    );

    return {
      name: nameField,
      slugHint: slugifyJaPlanName(name),
      regularMonthlyPrice: regular,
      campaignMonthlyPrice: campaign,
      effectiveMonthlyPrice: effective,
      initialFee,
      billingPeriod,
      storageValue,
      storageUnit,
    };
  });
}

function cellYes(
  row: { label: string; cells: TableCell[] } | null,
): boolean | null {
  if (!row || row.cells.length === 0) return null;
  if (row.cells.every((c) => c.hasYes)) return true;
  if (row.cells.every((c) => c.hasNo)) return false;
  if (row.cells.some((c) => c.hasYes)) return true;
  return null;
}

function buildComparison(
  parsed: ParsedPricePage,
  sourceUrl: string,
): ScrapedComparisonValue[] {
  const sslRow = findRow(parsed.comparisonRows, ["無料", "SSL"]);
  const backupRow = findRow(parsed.comparisonRows, ["自動バックアップ"]);
  const wpRow = findRow(parsed.comparisonRows, ["WordPress"]);
  const diskRow = findRow(parsed.comparisonRows, ["ディスク"]);

  const retentionMatch = (backupRow?.label ?? parsed.pageText).match(
    /過去\s*(\d+)\s*日/,
  );
  const retentionDays = retentionMatch ? Number(retentionMatch[1]) : null;

  const storageHint = diskRow
    ? normalize.storage(diskRow.cells[0]?.text ?? "").mediaHint
    : null;

  const phoneMentioned =
    /お電話|電話サポート|電話でのお問い合わせ/.test(parsed.pageText);

  const freeSsl = cellYes(sslRow);
  const autoBackup = cellYes(backupRow);
  const wpYes = cellYes(wpRow);

  const items: ScrapedComparisonValue[] = [
    {
      ...createEmptyField<boolean>("free-ssl", "無料SSL", sourceUrl, {
        value: freeSsl,
        rawValue: sslRow?.label ?? null,
        sourceText: sslRow?.label ?? null,
        confidence: freeSsl != null ? "high" : "low",
        status: freeSsl != null ? "found" : "not_found",
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
          rawValue: wpRow?.label ?? null,
          sourceText: wpRow?.label ?? null,
          confidence: wpYes ? "medium" : "low",
          status: wpYes != null ? "found" : "not_found",
          warning: wpYes
            ? "WordPress対応行からの推測です。『簡単インストール』専用表記は別途確認してください。"
            : null,
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
          rawValue: backupRow?.label ?? null,
          sourceText: backupRow?.label ?? null,
          confidence: autoBackup != null ? "high" : "low",
          status: autoBackup != null ? "found" : "not_found",
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
          sourceText: backupRow?.label ?? null,
          confidence: retentionDays != null ? "high" : "low",
          status: retentionDays != null ? "found" : "not_found",
        },
      ),
      fieldSlug: "backup-retention-days",
    },
    {
      ...createEmptyField<boolean>("phone-support", "電話サポート", sourceUrl, {
        value: phoneMentioned ? true : null,
        rawValue: phoneMentioned ? "お電話でのお問い合わせ" : null,
        sourceText: phoneMentioned
          ? "料金ページ内にお電話でのお問い合わせ案内あり"
          : null,
        confidence: phoneMentioned ? "medium" : "low",
        status: phoneMentioned ? "found" : "not_found",
        warning: phoneMentioned
          ? "問い合わせ窓口の記載からの推測です。プラン条件は公式サポートページも確認してください。"
          : "電話サポートの明確な記載を料金ページから確認できませんでした。",
        inferred: true,
      }),
      fieldSlug: "phone-support",
    },
    {
      ...createEmptyField<string>("storage-type", "ストレージ種別", sourceUrl, {
        value: storageHint,
        rawValue: diskRow?.cells.map((c) => c.text).join(" / ") ?? null,
        sourceText: diskRow
          ? `${diskRow.label}: ${diskRow.cells.map((c) => c.text).join(", ")}`
          : null,
        confidence: storageHint ? "high" : "low",
        status: storageHint ? "found" : "not_found",
      }),
      fieldSlug: "storage-type",
    },
  ];

  return items;
}

async function scrapeXserver(
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

      const parsed = await parsePricePage(page);
      if (parsed.planNames.length === 0) {
        throw new Error("プラン名を取得できませんでした。ページ構造が変わった可能性があります。");
      }

      const plans = buildPlans(parsed, priceUrl);
      const comparisonValues = buildComparison(parsed, priceUrl);

      if (plans.some((p) => p.campaignMonthlyPrice.status === "ambiguous")) {
        warnings.push(
          "キャンペーン月額はキャッシュバック表示と区別できないため、自動反映対象外です。",
        );
      }
      if (plans.some((p) => p.effectiveMonthlyPrice.status === "ambiguous")) {
        warnings.push(
          "実質月額はキャッシュバック後の表示の可能性があり、信頼度を下げています。",
        );
      }

      const foundFields =
        plans.flatMap((p) =>
          [
            p.name,
            p.regularMonthlyPrice,
            p.campaignMonthlyPrice,
            p.effectiveMonthlyPrice,
            p.initialFee,
            p.billingPeriod,
            p.storageValue,
            p.storageUnit,
          ].filter((f) => f.status === "found"),
        ).length +
        comparisonValues.filter((c) => c.status === "found").length;

      return {
        serviceSlug: ctx.serviceSlug,
        provider: "xserver",
        fetchedAt: new Date().toISOString(),
        sourceUrls,
        plans,
        comparisonValues,
        warnings,
        success: foundFields > 0,
        errorMessage: null,
        pageText: parsed.pageText,
      };
    } finally {
      await page.close().catch(() => undefined);
    }
  });
}

export const xserverProvider: ScraperProvider = {
  id: "xserver",
  label: "エックスサーバー",
  supportedSlugs: ["xserver"],
  scrape: scrapeXserver,
};
