import { getProviderBySlug } from "@/lib/scraping/registry";
import { listSupportedProviderLabels } from "@/lib/scraping/catalog";
import type { ScrapedServiceData } from "@/lib/scraping/types";

export type RunScraperInput = {
  serviceId: string;
  serviceSlug: string;
  officialUrl: string | null;
};

export type ScraperErrorCode =
  | "missing_official_url"
  | "unsupported_provider"
  | "browser_launch_failed"
  | "page_access_failed"
  | "timeout"
  | "parse_failed"
  | "access_denied"
  | "not_found"
  | "unknown";

export type RunScraperResult = {
  ok: boolean;
  data: ScrapedServiceData | null;
  errorCode: ScraperErrorCode;
  errorMessage: string | null;
  /** 管理画面向け短い失敗理由 */
  shortReason: string | null;
  durationMs: number;
  log: Record<string, unknown>;
};

export function shortReasonFromCode(code: ScraperErrorCode): string {
  switch (code) {
    case "missing_official_url":
      return "公式URL未設定";
    case "unsupported_provider":
      return "Provider未対応";
    case "browser_launch_failed":
      return "ブラウザ起動失敗";
    case "page_access_failed":
      return "アクセス失敗";
    case "timeout":
      return "タイムアウト";
    case "parse_failed":
      return "料金表が見つかりません";
    case "access_denied":
      return "アクセス拒否";
    case "not_found":
      return "ページが存在しません";
    case "unknown":
    default:
      return "予期しないエラー";
  }
}

function classifyError(err: unknown): Pick<
  RunScraperResult,
  "errorCode" | "errorMessage" | "shortReason"
> {
  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();

  if (/公式url|official/i.test(message) && /未設定|空|ない/.test(message)) {
    return {
      errorCode: "missing_official_url",
      errorMessage: message,
      shortReason: shortReasonFromCode("missing_official_url"),
    };
  }
  if (/未対応|provider/i.test(message)) {
    return {
      errorCode: "unsupported_provider",
      errorMessage: message,
      shortReason: shortReasonFromCode("unsupported_provider"),
    };
  }
  if (/browser|chromium|executable/i.test(lower)) {
    return {
      errorCode: "browser_launch_failed",
      errorMessage:
        "ブラウザの起動に失敗しました。ローカルで Playwright の Chromium がインストールされているか確認してください。",
      shortReason: shortReasonFromCode("browser_launch_failed"),
    };
  }
  if (/403|401|access denied|拒否|bot/i.test(lower)) {
    return {
      errorCode: "access_denied",
      errorMessage: "公式サイトへのアクセスが拒否されました。",
      shortReason: shortReasonFromCode("access_denied"),
    };
  }
  if (/404|not found|存在しません/i.test(lower)) {
    return {
      errorCode: "not_found",
      errorMessage: "公式ページが見つかりませんでした。",
      shortReason: shortReasonFromCode("not_found"),
    };
  }
  if (
    /timeout|timed out|err_name_not_resolved|err_connection|接続できません/i.test(
      lower,
    )
  ) {
    return {
      errorCode: "timeout",
      errorMessage: /サービス終了|接続できません/.test(message)
        ? "公式サイトに接続できません。サービス終了の可能性があります（要手動確認）。"
        : "公式サイトの応答がタイムアウトしました。しばらくして再試行してください。",
      shortReason: shortReasonFromCode("timeout"),
    };
  }
  if (
    /アクセス|status|net::|navigation|許可されていないドメイン|dns/i.test(lower)
  ) {
    return {
      errorCode: "page_access_failed",
      errorMessage: "公式ページへのアクセスに失敗しました。",
      shortReason: shortReasonFromCode("page_access_failed"),
    };
  }
  if (
    /テーブル|セレクタ|構造|プラン名|見つかりません|料金表|要手動確認/.test(
      message,
    )
  ) {
    return {
      errorCode: "parse_failed",
      errorMessage:
        /要手動確認|サービス終了/.test(message)
          ? message.slice(0, 200)
          : "ページ構造の解析に失敗しました。公式サイトのレイアウトが変わった可能性があります。",
      shortReason: /構造/.test(message)
        ? "HTML構造変更の可能性"
        : shortReasonFromCode("parse_failed"),
    };
  }
  return {
    errorCode: "unknown",
    errorMessage: "公式情報の取得中にエラーが発生しました。",
    shortReason: shortReasonFromCode("unknown"),
  };
}

export async function runOfficialScraper(
  input: RunScraperInput,
): Promise<RunScraperResult> {
  const started = Date.now();
  const log: Record<string, unknown> = {
    serviceId: input.serviceId,
    serviceSlug: input.serviceSlug,
    startedAt: new Date(started).toISOString(),
  };

  if (!input.officialUrl?.trim()) {
    return {
      ok: false,
      data: null,
      errorCode: "missing_official_url",
      errorMessage: "公式URLが未設定です。基本情報で公式URLを登録してください。",
      shortReason: shortReasonFromCode("missing_official_url"),
      durationMs: Date.now() - started,
      log: { ...log, errorCode: "missing_official_url" },
    };
  }

  const provider = getProviderBySlug(input.serviceSlug);
  if (!provider) {
    return {
      ok: true,
      data: null,
      errorCode: "unsupported_provider",
      errorMessage: "このサービスはまだ公式情報取得に対応していません。",
      shortReason: shortReasonFromCode("unsupported_provider"),
      durationMs: Date.now() - started,
      log: {
        ...log,
        errorCode: "unsupported_provider",
        supportedProviders: listSupportedProviderLabels(),
      },
    };
  }

  log.provider = provider.id;
  log.officialUrl = input.officialUrl;

  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const data = await provider.scrape({
        serviceId: input.serviceId,
        serviceSlug: input.serviceSlug,
        officialUrl: input.officialUrl,
      });

      const foundCount =
        data.plans.reduce((acc, plan) => {
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
        data.comparisonValues.filter((c) => c.status === "found").length;

      const missingCount =
        data.plans.reduce((acc, plan) => {
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
          return (
            acc +
            fields.filter(
              (f) => f.status === "not_found" || f.status === "error",
            ).length
          );
        }, 0) +
        data.comparisonValues.filter(
          (c) => c.status === "not_found" || c.status === "error",
        ).length;

      const durationMs = Date.now() - started;
      log.completedAt = new Date().toISOString();
      log.durationMs = durationMs;
      log.sourceUrls = data.sourceUrls;
      log.foundCount = foundCount;
      log.missingCount = missingCount;
      log.warningCount = data.warnings.length;
      log.success = data.success;

      console.info("[scraping]", JSON.stringify(log));

      return {
        ok: data.success,
        data,
        errorCode: data.success ? "unknown" : "parse_failed",
        errorMessage: data.success
          ? null
          : data.errorMessage ?? "取得できた項目がありません。",
        shortReason: data.success
          ? null
          : shortReasonFromCode("parse_failed"),
        durationMs,
        log,
      };
    } catch (err) {
      lastError = err;
      console.error("[scraping] attempt failed", {
        ...log,
        attempt,
        message: err instanceof Error ? err.message : String(err),
      });
      if (attempt === 0) {
        const msg = err instanceof Error ? err.message : String(err);
        // 不通系は再試行しても同じ結果になりやすい
        if (
          /timeout|timed out|ERR_NAME_NOT_RESOLVED|ERR_CONNECTION|接続できません/i.test(
            msg,
          )
        ) {
          break;
        }
        continue;
      }
    }
  }

  const classified = classifyError(lastError);
  const durationMs = Date.now() - started;
  log.completedAt = new Date().toISOString();
  log.durationMs = durationMs;
  log.errorCode = classified.errorCode;
  log.errorDetail =
    lastError instanceof Error ? lastError.message : String(lastError);
  console.error("[scraping] failed", JSON.stringify(log));

  return {
    ok: false,
    data: null,
    errorCode: classified.errorCode,
    errorMessage: classified.errorMessage,
    shortReason: classified.shortReason,
    durationMs,
    log,
  };
}
