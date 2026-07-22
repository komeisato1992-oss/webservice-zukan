import type { Page } from "playwright";
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

const ALLOWED_HOSTS = ["conoha.jp"];
const PRICE_PATH = "/pricing/";
const TARGET_PERIOD = "36ヶ月";
const TARGET_PLAN_NAMES = ["ベーシック", "スタンダード", "プレミアム"] as const;

type ParsedPlanCard = {
  name: string;
  monthlyRaw: string;
  monthlyValue: number | null;
  discountNote: string | null;
  initialFee: number | null;
  storageValue: number | null;
  storageUnit: string | null;
  hasFreeSsl: boolean;
  hasAutoBackup: boolean;
  hasPhoneSupport: boolean;
  bodyText: string;
};

async function selectWingPackPeriod(
  page: Page,
  periodLabel: string,
): Promise<void> {
  const clicked = await page.evaluate((label) => {
    const roots = Array.from(
      document.querySelectorAll(".pricingType01.pricingType01-A"),
    );
    const root = roots[0] || document.querySelector(".pricingType01");
    if (!root) return false;

    // WINGパック側を優先（通常料金タブは対象外）
    const packTab = Array.from(
      root.querySelectorAll(
        ".pricingType01NavigationChargeLabel, [class*='NavigationCharge'] label, button, a, li",
      ),
    ).find((el) =>
      (el.textContent || "").replace(/\s+/g, "").includes("WINGパック"),
    );
    if (packTab && "click" in packTab) {
      (packTab as HTMLElement).click();
    }

    const item = Array.from(
      root.querySelectorAll(".pricingType01NavigationMonthList_item"),
    ).find((el) =>
      (el.textContent || "").replace(/\s+/g, "").includes(label),
    );
    if (!item) return false;
    const input = item.querySelector("input");
    if (input) {
      input.click();
      return true;
    }
    const lab = item.querySelector("label");
    if (lab) {
      lab.click();
      return true;
    }
    (item as HTMLElement).click();
    return true;
  }, periodLabel);

  if (!clicked) {
    throw new Error(
      `契約期間「${periodLabel}」の切り替えに失敗しました。ページ構造が変わった可能性があります。`,
    );
  }

  // 表示価格の更新を待つ（固定 sleep ではなく価格テキスト変化を待つ）
  await page
    .waitForFunction(
      () => {
        const root =
          document.querySelector(".pricingType01.pricingType01-A") ||
          document.querySelector(".pricingType01");
        if (!root) return false;
        const units = Array.from(
          root.querySelectorAll(".pricingType01TablePlanUnit"),
        ).filter((el) => el.getClientRects().length > 0);
        return units.some((unit) =>
          /月額\s*[\d,]+\s*円/.test(unit.textContent || ""),
        );
      },
      { timeout: 10_000 },
    )
    .catch(() => undefined);
}

async function parseVisiblePlanCards(page: Page): Promise<{
  plans: ParsedPlanCard[];
  pageText: string;
}> {
  return page.evaluate((targetNames: string[]) => {
    const root =
      document.querySelector(".pricingType01.pricingType01-A") ||
      document.querySelector(".pricingType01");
    if (!root) {
      throw new Error("料金プラン領域が見つかりません");
    }

    const units = Array.from(
      root.querySelectorAll(".pricingType01TablePlanUnit"),
    ).filter((el) => el.getClientRects().length > 0);

    const plans = [];
    for (let i = 0; i < units.length; i++) {
      const unit = units[i];
      const name = (
        unit.querySelector(".pricingType01TablePlanUnitHeadPlan_name")
          ?.textContent || ""
      )
        .replace(/\s+/g, " ")
        .trim();
      if (!targetNames.includes(name)) continue;

      const bodyEl = unit.querySelector(
        ".pricingType01TablePlanUnitBody",
      ) as HTMLElement | null;
      const bodyText = (bodyEl?.innerText || unit.textContent || "")
        .replace(/\s+/g, " ")
        .trim();

      const monthlyMatch = bodyText.match(/月額\s*([\d,]+)\s*円/);
      const monthlyRaw = monthlyMatch ? monthlyMatch[0] : "";
      const monthlyValue = monthlyMatch
        ? Number(monthlyMatch[1].replace(/,/g, ""))
        : null;
      const discountNoteMatch = bodyText.match(/通常料金より\s*\d+%OFF/);
      const ssdMatch = bodyText.match(/SSD容量\s*(\d+)\s*(GB|TB)/i);
      const hasFreeSsl = /独自SSL\s*無料/.test(bodyText);
      const hasAutoBackup = /自動バックアップ\s*無料/.test(bodyText);
      const hasPhoneSupport = /電話・メールサポート\s*あり/.test(bodyText);
      const initialFee = /初期費用\s*無料/.test(bodyText) ? 0 : null;

      plans.push({
        name,
        monthlyRaw,
        monthlyValue: Number.isFinite(monthlyValue as number)
          ? monthlyValue
          : null,
        discountNote: discountNoteMatch ? discountNoteMatch[0] : null,
        initialFee,
        storageValue: ssdMatch ? Number(ssdMatch[1]) : null,
        storageUnit: ssdMatch ? ssdMatch[2].toUpperCase() : null,
        hasFreeSsl,
        hasAutoBackup,
        hasPhoneSupport,
        bodyText,
      });
    }

    return {
      plans,
      pageText: document.body.innerText.slice(0, 20000),
    };
  }, [...TARGET_PLAN_NAMES]);
}

function buildPlans(
  cards: ParsedPlanCard[],
  sourceUrl: string,
): ScrapedPlan[] {
  return cards.map((card) => {
    const campaignNote =
      "表示価格はWINGパックのキャンペーン料金の可能性があります。通常料金（時間課金）や非キャンペーン時と混同しないでください。";

    const nameField = createEmptyField<string>("name", "プラン名", sourceUrl, {
      value: card.name,
      rawValue: card.name,
      confidence: "high",
      status: "found",
    });

    const regular = createEmptyField<number>(
      "regularMonthlyPrice",
      "通常月額",
      sourceUrl,
      card.monthlyValue != null
        ? {
            value: card.monthlyValue,
            rawValue: card.monthlyRaw,
            sourceText: `${card.bodyText.slice(0, 160)}${
              card.discountNote ? ` / ${card.discountNote}` : ""
            }`,
            confidence: "medium",
            status: "found",
            warning: campaignNote,
            inferred: true,
          }
        : {
            status: "not_found",
            warning: "月額料金を取得できませんでした。",
          },
    );

    const campaign = createEmptyField<number>(
      "campaignMonthlyPrice",
      "キャンペーン月額",
      sourceUrl,
      {
        value: card.monthlyValue,
        rawValue: card.monthlyRaw,
        confidence: "medium",
        status: "ambiguous",
        warning:
          "WINGパック表示価格と期間限定キャンペーンの区別がつきにくいため、自動反映しません。",
      },
    );

    const effective = createEmptyField<number>(
      "effectiveMonthlyPrice",
      "実質月額",
      sourceUrl,
      {
        value: card.monthlyValue,
        rawValue: card.monthlyRaw,
        confidence: "medium",
        status: "ambiguous",
        warning:
          "表示は月額換算のパック料金であり、キャッシュバック後の実質価格とは限りません。",
        inferred: true,
      },
    );

    const initialFee = createEmptyField<number>(
      "initialFee",
      "初期費用",
      sourceUrl,
      card.initialFee != null
        ? {
            value: card.initialFee,
            rawValue: "初期費用 無料",
            confidence: "high",
            status: "found",
          }
        : { status: "not_found" },
    );

    const billingPeriod = createEmptyField<string>(
      "billingPeriod",
      "契約期間",
      sourceUrl,
      {
        value: TARGET_PERIOD,
        rawValue: TARGET_PERIOD,
        confidence: "medium",
        status: "found",
        warning: "代表値として36ヶ月（WINGパック）を採用しています。",
        inferred: true,
      },
    );

    const storageValue = createEmptyField<number>(
      "storageValue",
      "容量",
      sourceUrl,
      card.storageValue != null
        ? {
            value: card.storageValue,
            rawValue: `SSD容量 ${card.storageValue}${card.storageUnit}`,
            confidence: "high",
            status: "found",
          }
        : { status: "not_found" },
    );

    const storageUnit = createEmptyField<string>(
      "storageUnit",
      "容量単位",
      sourceUrl,
      card.storageUnit
        ? {
            value: card.storageUnit,
            rawValue: card.storageUnit,
            confidence: "high",
            status: "found",
          }
        : { status: "not_found" },
    );

    return {
      name: nameField,
      slugHint: slugifyJaPlanName(card.name),
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

function buildComparison(
  cards: ParsedPlanCard[],
  pageText: string,
  sourceUrl: string,
): ScrapedComparisonValue[] {
  const allSsl = cards.length > 0 && cards.every((c) => c.hasFreeSsl);
  const allBackup = cards.length > 0 && cards.every((c) => c.hasAutoBackup);
  const allPhone = cards.length > 0 && cards.every((c) => c.hasPhoneSupport);
  const hasWordpress = /WordPress/.test(pageText);
  const retentionMatch = pageText.match(/過去\s*(\d+)\s*日|(\d+)\s*日分/);

  return [
    {
      ...createEmptyField<boolean>("free-ssl", "無料SSL", sourceUrl, {
        value: allSsl ? true : null,
        rawValue: allSsl ? "独自SSL 無料" : null,
        confidence: allSsl ? "high" : "low",
        status: allSsl ? "found" : "not_found",
      }),
      fieldSlug: "free-ssl",
    },
    {
      ...createEmptyField<boolean>(
        "wordpress-easy-install",
        "WordPress簡単インストール",
        sourceUrl,
        {
          value: hasWordpress ? true : null,
          rawValue: hasWordpress ? "WordPress" : null,
          confidence: hasWordpress ? "medium" : "low",
          status: hasWordpress ? "found" : "not_found",
          warning: hasWordpress
            ? "料金ページ上のWordPress関連記載からの推測です。簡単インストールの有無は機能ページでも確認してください。"
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
          value: allBackup ? true : null,
          rawValue: allBackup ? "自動バックアップ 無料" : null,
          confidence: allBackup ? "high" : "low",
          status: allBackup ? "found" : "not_found",
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
          value: retentionMatch
            ? Number(retentionMatch[1] || retentionMatch[2])
            : null,
          rawValue: retentionMatch?.[0] ?? null,
          confidence: retentionMatch ? "medium" : "low",
          status: retentionMatch ? "found" : "not_found",
          warning: retentionMatch
            ? null
            : "料金ページから保持日数を特定できませんでした。",
        },
      ),
      fieldSlug: "backup-retention-days",
    },
    {
      ...createEmptyField<boolean>("phone-support", "電話サポート", sourceUrl, {
        value: allPhone ? true : null,
        rawValue: allPhone ? "電話・メールサポート あり" : null,
        confidence: allPhone ? "high" : "low",
        status: allPhone ? "found" : "not_found",
      }),
      fieldSlug: "phone-support",
    },
    {
      ...createEmptyField<string>("storage-type", "ストレージ種別", sourceUrl, {
        value: "SSD",
        rawValue: "SSD容量",
        confidence: "high",
        status: "found",
        warning: "NVMeかどうかは料金カード表記からは判別できません。",
      }),
      fieldSlug: "storage-type",
    },
  ];
}

async function scrapeConohaWing(
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

      await page.waitForSelector(".pricingType01TablePlanUnit", {
        state: "attached",
        timeout: 30_000,
      });

      await selectWingPackPeriod(page, TARGET_PERIOD);
      const parsed = await parseVisiblePlanCards(page);

      if (parsed.plans.length === 0) {
        throw new Error(
          "プランカードを取得できませんでした。ページ構造が変わった可能性があります。",
        );
      }

      const plans = buildPlans(parsed.plans, priceUrl);
      const comparisonValues = buildComparison(
        parsed.plans,
        parsed.pageText,
        priceUrl,
      );

      warnings.push(
        "料金はWINGパック（長期前払い）の月額換算表示です。通常料金（時間課金）とは異なります。",
      );
      if (plans.some((p) => p.regularMonthlyPrice.warning)) {
        warnings.push(
          "表示価格はキャンペーン適用中の可能性があります。適用期間外は金額が変わる場合があります。",
        );
      }

      const foundFields =
        plans.reduce((acc, plan) => {
          const fields = [
            plan.name,
            plan.regularMonthlyPrice,
            plan.campaignMonthlyPrice,
            plan.effectiveMonthlyPrice,
            plan.initialFee,
            plan.billingPeriod,
            plan.storageValue,
            plan.storageUnit,
          ];
          return acc + fields.filter((f) => f.status === "found").length;
        }, 0) +
        comparisonValues.filter((c) => c.status === "found").length;

      return {
        serviceSlug: ctx.serviceSlug,
        provider: "conoha-wing",
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

export const conohaWingProvider: ScraperProvider = {
  id: "conoha-wing",
  label: "ConoHa WING",
  supportedSlugs: ["conoha-wing", "conoha"],
  scrape: scrapeConohaWing,
};
