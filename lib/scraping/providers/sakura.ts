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

const ALLOWED_HOSTS = ["rs.sakura.ad.jp", "sakura.ad.jp"];
const PLAN_PATH = "/plan/";
const FUNCTION_PATH = "/function/";
const TARGET_PLANS = ["ライト", "スタンダード", "ビジネス", "ビジネスプロ"] as const;
const TARGET_PERIOD = "36ヶ月";

type ParsedSakuraPlan = {
  name: string;
  monthlyEquivalent: number | null;
  annualOrPeriodTotal: number | null;
  periodLabel: string;
  initialFee: number | null;
  storageRaw: string;
  storageValue: number | null;
  storageUnit: string | null;
  hasWordpress: boolean;
  hasBackup: boolean;
  bodyText: string;
};

type ParsedSakura = {
  plans: ParsedSakuraPlan[];
  pageText: string;
  functionText: string;
  diskByPlan: Record<string, string>;
};

async function parsePlanCards(page: Page): Promise<{
  plans: ParsedSakuraPlan[];
  pageText: string;
}> {
  await page.waitForSelector("body", { timeout: 30_000 });
  await page.waitForTimeout(1000);

  return page.evaluate((targetNames: string[]) => {
    const pageText = document.body.innerText.slice(0, 25000);
    const candidates = Array.from(
      document.querySelectorAll("a, article, section, div, li"),
    );
    const plans: {
      name: string;
      monthlyEquivalent: number | null;
      annualOrPeriodTotal: number | null;
      periodLabel: string;
      initialFee: number | null;
      storageRaw: string;
      storageValue: number | null;
      storageUnit: string | null;
      hasWordpress: boolean;
      hasBackup: boolean;
      bodyText: string;
    }[] = [];
    const seen = new Set<string>();

    for (let i = 0; i < candidates.length; i++) {
      const el = candidates[i];
      const text = (el.textContent || "").replace(/\s+/g, " ").trim();
      if (text.length < 40 || text.length > 450) continue;
      if (!/月額換算/.test(text) && !/SSD容量/.test(text)) continue;

      let matchedName: string | null = null;
      for (let n = 0; n < targetNames.length; n++) {
        if (text.includes(targetNames[n])) {
          matchedName = targetNames[n];
          break;
        }
      }
      if (!matchedName || seen.has(matchedName)) continue;
      // メール専用などを除外
      if (/メール専用|マネージド/.test(text) && !text.includes("レンタル")) {
        // still allow ビジネスプロ etc.
      }
      if (/メールボックス|メールだけ/.test(text)) continue;

      const monthlyMatch = text.match(/月額換算\s*([\d,]+)\s*円/);
      const totalMatch = text.match(/([\d,]+)\s*円\s*月額換算/);
      // カードに年額合計が無い場合もある
      const periodMatch = text.match(/(\d+)\s*ヶ月/);
      const storageMatch = text.match(/SSD容量\s*([\d,]+)\s*(GB|TB)/i);
      const initialFee = /初期費用\s*無料|初期費用\s*0/.test(text)
        ? 0
        : null;

      seen.add(matchedName);
      plans.push({
        name: matchedName,
        monthlyEquivalent: monthlyMatch
          ? Number(monthlyMatch[1].replace(/,/g, ""))
          : null,
        annualOrPeriodTotal: totalMatch
          ? Number(totalMatch[1].replace(/,/g, ""))
          : null,
        periodLabel: periodMatch ? `${periodMatch[1]}ヶ月` : "36ヶ月",
        initialFee,
        storageRaw: storageMatch
          ? `SSD容量 ${storageMatch[1]}${storageMatch[2]}`
          : "",
        storageValue: storageMatch
          ? Number(storageMatch[1].replace(/,/g, ""))
          : null,
        storageUnit: storageMatch ? storageMatch[2].toUpperCase() : null,
        hasWordpress: /WordPress/.test(text),
        hasBackup: /バックアップ/.test(text),
        bodyText: text.slice(0, 280),
      });
    }

    // 料金表からも補完（カードで月額換算が取れない場合）
    if (plans.length < targetNames.length) {
      const table = document.querySelector("table");
      if (table) {
        const rows = Array.from(table.querySelectorAll("tr"));
        for (let r = 0; r < rows.length; r++) {
          const cells = Array.from(rows[r].querySelectorAll("th,td")).map((c) =>
            (c.textContent || "").replace(/\s+/g, " ").trim(),
          );
          if (cells.length < 3) continue;
          let name: string | null = null;
          for (let n = 0; n < targetNames.length; n++) {
            if (cells.some((c) => c === targetNames[n])) {
              name = targetNames[n];
              break;
            }
          }
          if (!name || seen.has(name)) continue;
          // 36ヶ月一括列を探す（通常 index 1 or 含むセル）
          let periodCell = "";
          for (let c = 0; c < cells.length; c++) {
            if (/月額換算/.test(cells[c])) {
              periodCell = cells[c];
              break;
            }
          }
          if (!periodCell) continue;
          const monthlyMatch = periodCell.match(/月額換算\s*([\d,]+)\s*円/);
          const totalMatch = periodCell.match(/([\d,]+)\s*円/);
          const initialCell = cells.find((c) => /無料|円/.test(c) && c.length < 20);
          seen.add(name);
          plans.push({
            name,
            monthlyEquivalent: monthlyMatch
              ? Number(monthlyMatch[1].replace(/,/g, ""))
              : null,
            annualOrPeriodTotal: totalMatch
              ? Number(totalMatch[1].replace(/,/g, ""))
              : null,
            periodLabel: "36ヶ月",
            initialFee: initialCell && /無料/.test(initialCell) ? 0 : null,
            storageRaw: "",
            storageValue: null,
            storageUnit: null,
            hasWordpress: true,
            hasBackup: true,
            bodyText: periodCell,
          });
        }
      }
    }

    return { plans, pageText };
  }, [...TARGET_PLANS]);
}

async function parseFunctionPage(page: Page): Promise<{
  text: string;
  diskByPlan: Record<string, string>;
}> {
  await page.waitForSelector("body", { timeout: 30_000 });
  return page.evaluate((targetNames: string[]) => {
    const diskByPlan: Record<string, string> = {};
    const rows = Array.from(document.querySelectorAll("table tr"));
    for (let r = 0; r < rows.length; r++) {
      const cells = Array.from(rows[r].querySelectorAll("th,td")).map((c) =>
        (c.textContent || "").replace(/\s+/g, " ").trim(),
      );
      if (cells.length < 2) continue;
      if (!/ストレージ容量|SSD容量|ディスク/.test(cells[0])) continue;
      // header row for plan names may be previous; values align to known order
      for (let i = 0; i < targetNames.length && i + 1 < cells.length; i++) {
        if (/\d+\s*(GB|TB)/i.test(cells[i + 1])) {
          diskByPlan[targetNames[i]] = cells[i + 1];
        }
      }
    }
    return {
      text: document.body.innerText.slice(0, 20000),
      diskByPlan,
    };
  }, [...TARGET_PLANS]);
}

function buildPlans(parsed: ParsedSakura, sourceUrl: string): ScrapedPlan[] {
  return parsed.plans.map((plan) => {
    const name = normalizePlanName(plan.name);
    const periodMonths =
      Number((plan.periodLabel.match(/(\d+)/) || [])[1]) || 36;

    let monthly = plan.monthlyEquivalent;
    let inferredMonthly = false;
    const annualRaw = plan.annualOrPeriodTotal;

    // 月額換算が無く、期間合計だけある場合は換算（年額等を保持）
    if (monthly == null && annualRaw != null && periodMonths > 0) {
      monthly = Math.round(annualRaw / periodMonths);
      inferredMonthly = true;
    }

    const diskRaw = plan.storageRaw || parsed.diskByPlan[plan.name] || "";
    const parsedStorage = normalize.storage(diskRaw);
    const storageValue = plan.storageValue ?? parsedStorage.value;
    const storageUnit = plan.storageUnit ?? parsedStorage.unit;

    return {
      name: createEmptyField<string>("name", "プラン名", sourceUrl, {
        value: name,
        rawValue: plan.name,
        confidence: "high",
        status: "found",
      }),
      slugHint: slugifyJaPlanName(name),
      regularMonthlyPrice: createEmptyField<number>(
        "regularMonthlyPrice",
        "通常月額",
        sourceUrl,
        monthly != null
          ? {
              value: monthly,
              rawValue: plan.bodyText,
              sourceText: annualRaw != null
                ? `期間合計 ${annualRaw.toLocaleString("ja-JP")}円 / 月額換算 ${monthly.toLocaleString("ja-JP")}円`
                : `月額換算 ${monthly.toLocaleString("ja-JP")}円`,
              confidence: inferredMonthly ? "medium" : "high",
              status: "found",
              warning: inferredMonthly
                ? `公式の期間合計（${annualRaw?.toLocaleString("ja-JP")}円）を${periodMonths}で割って月額換算しました。`
                : "公式の月額換算表示を採用しています。",
              inferred: inferredMonthly,
            }
          : {
              status: "not_found",
              rawValue: plan.bodyText,
              warning:
                annualRaw != null
                  ? `期間合計 ${annualRaw.toLocaleString("ja-JP")}円のみ取得。月額換算できませんでした。`
                  : "月額換算料金を取得できませんでした。",
            },
      ),
      campaignMonthlyPrice: createEmptyField<number>(
        "campaignMonthlyPrice",
        "キャンペーン月額",
        sourceUrl,
        {
          status: "not_found",
          warning: "期間一括の割引は通常の契約条件として扱い、キャンペーン月額には入れていません。",
        },
      ),
      effectiveMonthlyPrice: createEmptyField<number>(
        "effectiveMonthlyPrice",
        "実質月額",
        sourceUrl,
        monthly != null
          ? {
              value: monthly,
              rawValue: annualRaw != null ? `${annualRaw}円` : null,
              confidence: "medium",
              status: "ambiguous",
              warning: "期間一括の月額換算です。キャッシュバック後の実質価格とは限りません。",
              inferred: true,
            }
          : { status: "not_found" },
      ),
      initialFee: createEmptyField<number>("initialFee", "初期費用", sourceUrl, {
        ...(plan.initialFee != null
          ? {
              value: plan.initialFee,
              rawValue: plan.initialFee === 0 ? "無料" : `${plan.initialFee}円`,
              confidence: "high" as const,
              status: "found" as const,
            }
          : { status: "not_found" as const }),
      }),
      billingPeriod: createEmptyField<string>(
        "billingPeriod",
        "契約期間",
        sourceUrl,
        {
          value: plan.periodLabel || TARGET_PERIOD,
          rawValue: plan.periodLabel || TARGET_PERIOD,
          confidence: "medium",
          status: "found",
          warning: "代表値として36ヶ月一括の月額換算を採用しています。",
          inferred: true,
        },
      ),
      storageValue: createEmptyField<number>("storageValue", "容量", sourceUrl, {
        ...(storageValue != null
          ? {
              value: storageValue,
              rawValue: diskRaw || plan.storageRaw,
              confidence: "high" as const,
              status: "found" as const,
            }
          : { status: "not_found" as const, rawValue: diskRaw || plan.storageRaw }),
      }),
      storageUnit: createEmptyField<string>(
        "storageUnit",
        "容量単位",
        sourceUrl,
        storageUnit
          ? {
              value: storageUnit,
              rawValue: diskRaw || plan.storageRaw,
              confidence: "high",
              status: "found",
            }
          : { status: "not_found", rawValue: diskRaw || plan.storageRaw },
      ),
    };
  });
}

function buildComparison(
  parsed: ParsedSakura,
  sourceUrl: string,
): ScrapedComparisonValue[] {
  const allWp =
    parsed.plans.length > 0 && parsed.plans.every((p) => p.hasWordpress);
  const allBackup =
    parsed.plans.length > 0 && parsed.plans.every((p) => p.hasBackup);
  const text = `${parsed.pageText}\n${parsed.functionText}`;
  const freeSsl = /無料SSL|Let's Encrypt|独自SSL/.test(text);
  const phone = /電話サポート|お電話|コールセンター/.test(text);
  const mail = /メールサポート|メールでのお問い合わせ|お問い合わせ/.test(text);

  return [
    {
      ...createEmptyField<boolean>("free-ssl", "無料SSL", sourceUrl, {
        value: freeSsl ? true : null,
        rawValue: freeSsl ? "無料SSL / Let's Encrypt" : null,
        confidence: freeSsl ? "high" : "low",
        status: freeSsl ? "found" : "not_found",
      }),
      fieldSlug: "free-ssl",
    },
    {
      ...createEmptyField<boolean>(
        "wordpress-easy-install",
        "WordPress簡単インストール",
        sourceUrl,
        {
          value: allWp || /WordPress|クイックインストール/.test(text),
          rawValue: "WordPress",
          confidence: "medium",
          status: "found",
          warning: "プランカード／機能ページのWordPress記載からの取得です。",
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
          value: allBackup || /バックアップ/.test(text),
          rawValue: "バックアップ＆ステージング",
          confidence: "medium",
          status: "found",
          warning: "バックアップ機能の有無としての取得です。世代数は要確認です。",
          inferred: true,
        },
      ),
      fieldSlug: "automatic-backup",
    },
    {
      ...createEmptyField<boolean>("phone-support", "電話サポート", sourceUrl, {
        value: phone ? true : null,
        rawValue: phone ? "電話" : null,
        confidence: "low",
        status: phone ? "found" : "not_found",
        warning: "サポート導線上の記載からの推測です。プラン条件は要確認です。",
        inferred: true,
      }),
      fieldSlug: "phone-support",
    },
    {
      ...createEmptyField<boolean>("email-support", "メールサポート", sourceUrl, {
        value: mail ? true : null,
        rawValue: mail ? "メール" : null,
        confidence: "medium",
        status: mail ? "found" : "not_found",
        inferred: true,
      }),
      fieldSlug: "email-support",
    },
    {
      ...createEmptyField<string>("storage-type", "ストレージ種別", sourceUrl, {
        value: "SSD",
        rawValue: "SSD容量",
        confidence: "high",
        status: "found",
      }),
      fieldSlug: "storage-type",
    },
  ];
}

async function scrapeSakura(
  ctx: ScraperProviderContext,
): Promise<ScrapedServiceData> {
  assertOfficialHost(ctx.officialUrl, ALLOWED_HOSTS);
  const planUrl = resolveOfficialPath(ctx.officialUrl, PLAN_PATH);
  const functionUrl = resolveOfficialPath(ctx.officialUrl, FUNCTION_PATH);
  const warnings: string[] = [];
  const sourceUrls: string[] = [];

  return withBrowser(async (browser) => {
    const page = await newScrapingPage(browser);
    try {
      await gotoOfficial(page, planUrl);
      sourceUrls.push(planUrl);
      const planParsed = await parsePlanCards(page);

      let functionText = "";
      let diskByPlan: Record<string, string> = {};
      try {
        await gotoOfficial(page, functionUrl);
        sourceUrls.push(functionUrl);
        const funcParsed = await parseFunctionPage(page);
        functionText = funcParsed.text;
        diskByPlan = funcParsed.diskByPlan;
      } catch {
        warnings.push("機能一覧ページの取得に失敗したため、プランページ情報のみで比較項目を推定しています。");
      }

      const parsed: ParsedSakura = {
        plans: planParsed.plans,
        pageText: planParsed.pageText,
        functionText,
        diskByPlan,
      };

      if (parsed.plans.length === 0) {
        throw new Error(
          "プランカードを取得できませんでした。ページ構造が変わった可能性があります。",
        );
      }

      const plans = buildPlans(parsed, planUrl);
      const comparisonValues = buildComparison(parsed, planUrl);
      warnings.push(
        "さくらの料金は期間一括の月額換算を通常月額として扱います。期間合計金額は raw / sourceText に保持しています。",
      );

      return baseResult(
        ctx,
        "sakura",
        sourceUrls,
        plans,
        comparisonValues,
        warnings,
        `${parsed.pageText}\n${parsed.functionText}`,
      );
    } finally {
      await page.close().catch(() => undefined);
    }
  });
}

export const sakuraProvider: ScraperProvider = {
  id: "sakura",
  label: "さくらのレンタルサーバ",
  supportedSlugs: ["sakura"],
  scrape: scrapeSakura,
};
