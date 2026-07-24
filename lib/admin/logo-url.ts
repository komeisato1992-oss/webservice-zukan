/** CMS draft 上で「ロゴを明示削除する」意思を表すメタキー（live には書かない） */
export const CLEAR_LOGO_URL_KEY = "_clear_logo_url";

export function isBlankLogoUrl(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value !== "string") return false;
  return value.trim() === "";
}

/**
 * services.update 用の logo_url 断片。
 * 空文字 / null / undefined は含めず、既存 DB 値を維持する。
 * 明示削除時のみ { logo_url: null } を返す。
 */
export function logoUrlUpdateFragment(
  raw: string | null | undefined,
  options?: { clearLogo?: boolean },
): { logo_url: string | null } | Record<string, never> {
  if (options?.clearLogo) return { logo_url: null };
  if (typeof raw !== "string") return {};
  const trimmed = raw.trim();
  if (!trimmed) return {};
  return { logo_url: trimmed };
}

/**
 * update パッチから空の logo_url を除外する（明示削除時は null をセット）。
 */
export function omitBlankLogoUrlFromPatch(
  patch: Record<string, unknown>,
  options?: { clearLogo?: boolean },
): Record<string, unknown> {
  if (options?.clearLogo) {
    patch.logo_url = null;
    return patch;
  }
  if (isBlankLogoUrl(patch.logo_url)) {
    delete patch.logo_url;
  } else if (typeof patch.logo_url === "string") {
    patch.logo_url = patch.logo_url.trim();
  }
  return patch;
}

/**
 * CMS 下書き保存時: ロゴ未入力なら直前の下書き／公開スナップショットの値を維持。
 * 明示削除フラグがある場合のみ null にする。
 */
export function preserveDraftLogoUrl(
  nextService: Record<string, unknown>,
  previousService?: Record<string, unknown> | null,
  publishedService?: Record<string, unknown> | null,
): Record<string, unknown> {
  const clear = nextService[CLEAR_LOGO_URL_KEY] === true;
  const { [CLEAR_LOGO_URL_KEY]: _clearFlag, ...rest } = nextService;

  if (clear) {
    return { ...rest, logo_url: null, [CLEAR_LOGO_URL_KEY]: true };
  }

  if (!isBlankLogoUrl(nextService.logo_url)) {
    return {
      ...rest,
      logo_url:
        typeof nextService.logo_url === "string"
          ? nextService.logo_url.trim()
          : nextService.logo_url,
    };
  }

  const fallback =
    (!isBlankLogoUrl(previousService?.logo_url)
      ? previousService?.logo_url
      : null) ??
    (!isBlankLogoUrl(publishedService?.logo_url)
      ? publishedService?.logo_url
      : null);

  if (!isBlankLogoUrl(fallback)) {
    return { ...rest, logo_url: fallback };
  }

  return rest;
}
