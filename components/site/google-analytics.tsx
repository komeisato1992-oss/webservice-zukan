import { GoogleAnalytics } from "@next/third-parties/google";

/**
 * GA4（本番のみ）。測定IDは NEXT_PUBLIC_GA_MEASUREMENT_ID。
 * @see https://nextjs.org/docs/app/guides/third-party-libraries#google-analytics
 */
export function SiteGoogleAnalytics() {
  if (process.env.NODE_ENV !== "production") return null;

  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
  if (!gaId) return null;

  return <GoogleAnalytics gaId={gaId} />;
}
