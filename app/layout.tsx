import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import { SiteGoogleAnalytics } from "@/components/site/google-analytics";
import { buildRootMetadata, buildSiteJsonLd } from "@/lib/site/seo";
import "./globals.css";

const notoSans = Noto_Sans_JP({
  variable: "--font-noto-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = buildRootMetadata();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const siteJsonLd = buildSiteJsonLd();

  return (
    <html lang="ja" className={`${notoSans.variable} h-full`}>
      <body className="min-h-full bg-white font-sans text-slate-900 antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
        {children}
        <SiteGoogleAnalytics />
      </body>
    </html>
  );
}
