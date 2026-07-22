import { buildFromPageData } from "@/lib/scraping/engine/build";
import {
  extractCards,
  extractTables,
} from "@/lib/scraping/engine/extract";
import { registerFullHandler } from "@/lib/scraping/engine/registry";
import type { FullHandler, PageData } from "@/lib/scraping/engine/types";
import {
  dismissCookieBanners,
  gotoOfficial,
  newScrapingPage,
  resolveOfficialPath,
  withBrowser,
} from "@/lib/scraping/utils/browser";

/**
 * FUTOKA 専用フルハンドラ。
 * - 重いリソースをブロック
 * - navigation timeout を個別延長
 * - 複数URLを順に試行
 * - 到達不能時は捏造せず失敗
 */
const futokaFullHandler: FullHandler = async ({
  officialUrl,
  definition,
}) => {
  const warnings = [...(definition.warnings ?? [])];
  const paths = [
    "/?mode=price",
    ...(definition.scrapeOptions?.alternatePaths ?? []),
  ].filter((v, i, arr) => arr.indexOf(v) === i);

  const navTimeout = definition.scrapeOptions?.navigationTimeoutMs ?? 50_000;
  const actionTimeout = definition.scrapeOptions?.actionTimeoutMs ?? 30_000;

  return withBrowser(async (browser) => {
    const page = await newScrapingPage(browser, {
      navigationTimeoutMs: navTimeout,
      actionTimeoutMs: actionTimeout,
      blockHeavyResources: true,
    });

    const errors: string[] = [];
    try {
      for (const path of paths) {
        const url = /^https?:\/\//i.test(path)
          ? path
          : resolveOfficialPath(officialUrl, path);
        try {
          const nav = await gotoOfficial(page, url, {
            navigationTimeoutMs: navTimeout,
          });
          await dismissCookieBanners(page).catch(() => false);

          const bodyText = await page
            .locator("body")
            .innerText()
            .catch(() => "");
          if (
            /サービス終了|新規申し込みは受け付けておりません|受付を終了/.test(
              bodyText,
            )
          ) {
            throw new Error(
              "公式サイトがサービス終了を案内しています。料金表は取得できません（要手動確認）。",
            );
          }

          await page
            .waitForSelector("table, .plan, .price, h1, h2", {
              state: "attached",
              timeout: Math.min(actionTimeout, 20_000),
            })
            .catch(() => undefined);

          let pageData: PageData | null = null;
          try {
            pageData = await extractTables(page, nav.finalUrl, {
              type: "tables",
              tableIndexes: [0],
              headerFilter: /SSD/,
              periodInFirstColumn: true,
            });
          } catch {
            try {
              pageData = await extractCards(page, nav.finalUrl, {
                unitSelector: ".plan, .price-box, .card, article, section",
                nameRegex: "SSD|プレミアム|スタンダード|プラチナ|ライト",
              });
              warnings.push(
                "テーブル抽出に失敗したためカード抽出を試行しました。",
              );
            } catch {
              // 本文から価格候補だけ拾うのは誤取得リスクが高いため成功扱いにしない
              throw new Error(
                "料金表が見つかりません。ページ構造変更またはサービス終了の可能性があります。",
              );
            }
          }

          const built = buildFromPageData(definition, { price: pageData });
          if (built.plans.length === 0) {
            throw new Error(
              "料金表は開けましたがプランを抽出できませんでした（要手動確認）。",
            );
          }

          const pageText =
            pageData &&
            typeof pageData === "object" &&
            "pageText" in pageData
              ? String((pageData as { pageText: string }).pageText)
              : null;
          return {
            plans: built.plans,
            comparisonValues: built.comparisonValues,
            sourceUrls: built.sourceUrls,
            warnings,
            pageText,
          };
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`${url}: ${msg}`);
          // タイムアウトも追加試行はコストが高いので1回で打ち切り
          if (/timeout|timed out/i.test(msg)) {
            break;
          }
        }
      }

      const joined = errors.join(" | ");
      if (/timeout|timed out|ERR_NAME_NOT_RESOLVED|ERR_CONNECTION/i.test(joined)) {
        throw new Error(
          `公式サイトに接続できません（タイムアウト/DNS）。サービス終了の可能性あり。詳細: ${joined.slice(0, 400)}`,
        );
      }
      throw new Error(
        errors[0] ??
          "FUTOKA の公式料金情報を取得できませんでした（要手動確認）。",
      );
    } finally {
      await page.close().catch(() => undefined);
    }
  });
};

registerFullHandler("futoka", futokaFullHandler);
