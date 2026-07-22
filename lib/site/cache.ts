import { revalidateTag } from "next/cache";

/** 公開サイトの DB 読み取りキャッシュ共通タグ */
export const PUBLIC_SITE_CACHE_TAG = "public-site";

/**
 * 公開データの既定再検証間隔（秒）。
 * ページの `export const revalidate = 300` も同じ値に揃えること（静的リテラル必須）。
 */
export const PUBLIC_DATA_REVALIDATE_SECONDS = 300;

/** 管理画面の更新後に公開データキャッシュを無効化 */
export function revalidatePublicSiteCache() {
  revalidateTag(PUBLIC_SITE_CACHE_TAG, "max");
}
