import type { Metadata } from "next";
import { NOINDEX_ROBOTS } from "@/lib/site/seo";

export const metadata: Metadata = {
  robots: NOINDEX_ROBOTS,
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
