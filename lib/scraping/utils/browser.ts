import { chromium, type Browser, type Page } from "playwright";

const DEFAULT_TIMEOUT_MS = 45_000;
const NAV_TIMEOUT_MS = 40_000;

export type BrowserPageOptions = {
  navigationTimeoutMs?: number;
  actionTimeoutMs?: number;
  blockHeavyResources?: boolean;
};

export async function withBrowser<T>(
  fn: (browser: Browser) => Promise<T>,
): Promise<T> {
  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--disable-dev-shm-usage"],
    });
    return await fn(browser);
  } finally {
    await browser?.close().catch(() => undefined);
  }
}

export async function newScrapingPage(
  browser: Browser,
  options: BrowserPageOptions = {},
): Promise<Page> {
  const page = await browser.newPage({
    userAgent:
      "WebserviceZukanBot/0.1 (+local-admin-scraper; respectful; low-frequency)",
    locale: "ja-JP",
  });
  page.setDefaultTimeout(options.actionTimeoutMs ?? DEFAULT_TIMEOUT_MS);
  page.setDefaultNavigationTimeout(
    options.navigationTimeoutMs ?? NAV_TIMEOUT_MS,
  );

  if (options.blockHeavyResources) {
    await page.route("**/*", (route) => {
      const type = route.request().resourceType();
      if (
        type === "image" ||
        type === "media" ||
        type === "font" ||
        type === "stylesheet"
      ) {
        return route.abort();
      }
      return route.continue();
    });
  }

  return page;
}

export async function gotoOfficial(
  page: Page,
  url: string,
  options: { navigationTimeoutMs?: number } = {},
): Promise<{ status: number; finalUrl: string; title: string }> {
  const response = await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: options.navigationTimeoutMs,
  });
  if (!response) {
    throw new Error(`ページにアクセスできませんでした: ${url}`);
  }
  const status = response.status();
  if (status >= 400) {
    throw new Error(`ページアクセスに失敗しました (${status}): ${url}`);
  }
  await page.waitForLoadState("domcontentloaded");
  const title = await page.title().catch(() => "");
  return { status, finalUrl: page.url(), title };
}

/** Cookie同意などのオーバーレイを可能な範囲で閉じる */
export async function dismissCookieBanners(
  page: Page,
  textIncludes: string[] = ["同意", "許可する", "Accept"],
): Promise<boolean> {
  return page.evaluate((needles) => {
    const candidates = Array.from(
      document.querySelectorAll("button, a, [role='button'], input[type='button']"),
    );
    for (const needle of needles) {
      const n = needle.replace(/\s+/g, "");
      for (const el of candidates) {
        const t = (el.textContent || (el as HTMLInputElement).value || "")
          .replace(/\s+/g, "");
        if (!t) continue;
        if (t === n || t.includes(n)) {
          (el as HTMLElement).click();
          return true;
        }
      }
    }
    return false;
  }, textIncludes);
}

export function assertOfficialHost(url: string, allowedHosts: string[]) {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error("公式URLの形式が不正です。");
  }
  const ok = allowedHosts.some(
    (h) => host === h || host.endsWith(`.${h}`),
  );
  if (!ok) {
    throw new Error(
      `許可されていないドメインです（${host}）。公式サイトのみ取得できます。`,
    );
  }
}

export function hostMatches(hostname: string, hosts: string[]): boolean {
  return hosts.some((h) => hostname === h || hostname.endsWith(`.${h}`));
}

export function resolveOfficialPath(
  officialUrl: string,
  path: string,
): string {
  const base = new URL(officialUrl);
  return new URL(path, `${base.origin}/`).toString();
}

/**
 * 旧ドメインが死んでいるサービス向けに、公式オリジンを正規URLへ置換する。
 */
export function rewriteOfficialUrlIfNeeded(
  officialUrl: string,
  opts:
    | {
        rewriteFromHosts?: string[];
        rewriteOfficialOrigin?: string;
      }
    | undefined,
): string {
  if (!opts?.rewriteOfficialOrigin || !opts.rewriteFromHosts?.length) {
    return officialUrl;
  }
  let parsed: URL;
  try {
    parsed = new URL(officialUrl);
  } catch {
    return officialUrl;
  }
  if (!hostMatches(parsed.hostname, opts.rewriteFromHosts)) {
    return officialUrl;
  }
  const canonical = new URL(opts.rewriteOfficialOrigin);
  parsed.protocol = canonical.protocol;
  parsed.host = canonical.host;
  return parsed.toString();
}
