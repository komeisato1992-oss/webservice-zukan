import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import { buildRootMetadata } from "@/lib/site/seo";
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
  return (
    <html lang="ja" className={`${notoSans.variable} h-full`}>
      <body className="min-h-full bg-white font-sans text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
