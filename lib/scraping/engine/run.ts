import { buildFromPageData } from "@/lib/scraping/engine/build";
import {
  extractCards,
  extractTables,
  runInteractiveSteps,
} from "@/lib/scraping/engine/extract";
import {
  getAfterBuildHandler,
  getExtractHandler,
  getFullHandler,
} from "@/lib/scraping/engine/registry";
import type {
  ExtractConfig,
  PageData,
  ScraperDefinition,
  ScraperPageDef,
} from "@/lib/scraping/engine/types";
import { baseResult } from "@/lib/scraping/providers/helpers";
import { collectPageText } from "@/lib/scraping/support-extract";
import type {
  ScrapedServiceData,
  ScraperProviderContext,
} from "@/lib/scraping/types";
import {
  assertOfficialHost,
  dismissCookieBanners,
  gotoOfficial,
  newScrapingPage,
  resolveOfficialPath,
  rewriteOfficialUrlIfNeeded,
  withBrowser,
} from "@/lib/scraping/utils/browser";

function resolvePageUrl(officialUrl: string, path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return resolveOfficialPath(officialUrl, path);
}

async function extractByConfig(
  page: Awaited<ReturnType<typeof newScrapingPage>>,
  officialUrl: string,
  pageDef: ScraperPageDef,
  sourceUrl: string,
  extract: ExtractConfig,
): Promise<PageData> {
  if (extract.type === "tables") {
    return extractTables(page, sourceUrl, extract);
  }
  if (extract.type === "cards") {
    return extractCards(page, sourceUrl, extract);
  }
  const handler = getExtractHandler(extract.name);
  return handler({
    page,
    officialUrl,
    pageDef,
    sourceUrl,
  });
}

export async function runScraperDefinition(
  definition: ScraperDefinition,
  ctx: ScraperProviderContext,
): Promise<ScrapedServiceData> {
  const scrapeOptions = definition.scrapeOptions;
  const officialUrl = rewriteOfficialUrlIfNeeded(
    ctx.officialUrl,
    scrapeOptions,
  );
  assertOfficialHost(officialUrl, definition.allowedHosts);

  if (definition.special?.fullHandler) {
    const handler = getFullHandler(definition.special.fullHandler);
    const result = await handler({
      officialUrl,
      serviceSlug: ctx.serviceSlug,
      definition,
    });
    return baseResult(
      ctx,
      definition.id,
      result.sourceUrls,
      result.plans,
      result.comparisonValues,
      [...(definition.warnings ?? []), ...result.warnings],
      result.pageText,
    );
  }

  const warnings = [...(definition.warnings ?? [])];
  if (officialUrl !== ctx.officialUrl) {
    warnings.push(
      `公式URLを ${new URL(officialUrl).origin} に正規化して取得しました（登録URL: ${ctx.officialUrl}）。`,
    );
  }
  const pageData: Record<string, PageData> = {};

  return withBrowser(async (browser) => {
    const page = await newScrapingPage(browser, {
      navigationTimeoutMs: scrapeOptions?.navigationTimeoutMs,
      actionTimeoutMs: scrapeOptions?.actionTimeoutMs,
      blockHeavyResources: scrapeOptions?.blockHeavyResources,
    });
    try {
      for (const pageDef of definition.pages) {
        const pathCandidates = [
          pageDef.path,
          ...(scrapeOptions?.alternatePaths ?? []),
        ].filter((v, i, arr) => arr.indexOf(v) === i);

        let lastError: unknown = null;
        let loaded = false;

        for (const path of pathCandidates) {
          const url = resolvePageUrl(officialUrl, path);
          try {
            const nav = await gotoOfficial(page, url, {
              navigationTimeoutMs: scrapeOptions?.navigationTimeoutMs,
            });
            if (scrapeOptions?.dismissCookieTextIncludes?.length) {
              const dismissed = await dismissCookieBanners(
                page,
                scrapeOptions.dismissCookieTextIncludes,
              );
              if (dismissed) await page.waitForTimeout(400);
            } else {
              await dismissCookieBanners(page).catch(() => false);
            }

            if (pageDef.waitFor) {
              await page.waitForSelector(pageDef.waitFor.selector, {
                state: pageDef.waitFor.state ?? "attached",
                timeout: scrapeOptions?.actionTimeoutMs ?? 30_000,
              });
            }
            await runInteractiveSteps(page, pageDef.before);

            let extracted: PageData;
            try {
              extracted = await extractByConfig(
                page,
                officialUrl,
                pageDef,
                nav.finalUrl || url,
                pageDef.extract,
              );
            } catch (extractErr) {
              if (pageDef.fallbackCards) {
                extracted = await extractCards(
                  page,
                  nav.finalUrl || url,
                  pageDef.fallbackCards,
                );
                warnings.push(
                  `${pageDef.id}: テーブル取得に失敗したためカード抽出へフォールバックしました。`,
                );
              } else {
                throw extractErr;
              }
            }

            pageData[pageDef.id] = extracted;
            loaded = true;
            break;
          } catch (err) {
            lastError = err;
            warnings.push(
              `${pageDef.id} (${path}) 取得失敗: ${
                err instanceof Error ? err.message : String(err)
              }`,
            );
          }
        }

        if (!loaded) {
          if (pageDef.required === false) {
            warnings.push(
              `${pageDef.id} ページの取得に失敗したためスキップしました: ${
                lastError instanceof Error
                  ? lastError.message
                  : String(lastError)
              }`,
            );
            continue;
          }
          throw lastError instanceof Error
            ? lastError
            : new Error(`${pageDef.id} ページの取得に失敗しました。`);
        }
      }

      const built = buildFromPageData(definition, pageData);
      let plans = built.plans;
      let comparisonValues = built.comparisonValues;
      const sourceUrls = built.sourceUrls;

      if (definition.special?.afterBuild) {
        const after = getAfterBuildHandler(definition.special.afterBuild);
        if (after) {
          const patched = after({
            plans,
            comparisonValues,
            pageData,
            definition,
          });
          plans = patched.plans;
          comparisonValues = patched.comparisonValues;
          if (patched.warnings?.length) warnings.push(...patched.warnings);
        }
      }

      const collected = collectPageText(pageData);

      if (plans.length === 0) {
        throw new Error(
          "プランを取得できませんでした。ページ構造が変わった可能性があります。",
        );
      }

      return baseResult(
        ctx,
        definition.id,
        sourceUrls,
        plans,
        comparisonValues,
        warnings,
        collected.text,
      );
    } finally {
      await page.close().catch(() => undefined);
    }
  });
}
