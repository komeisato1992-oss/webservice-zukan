import { SiteFooter, SiteHeader } from "@/components/site/header-footer";
import { CompareProvider } from "@/components/site/compare/compare-context";
import { PurposeSelectionProvider } from "@/components/site/purpose-selection-context";
import { CompareBar } from "@/components/site/compare/compare-bar";
import { SiteThemeShell } from "@/components/site/site-theme-shell";
import { DEFAULT_MAX_COMPARE } from "@/lib/site/compare-limits";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CompareProvider max={DEFAULT_MAX_COMPARE}>
      <PurposeSelectionProvider>
        <SiteThemeShell>
          <SiteHeader />
          <main className="relative z-0 flex-1">{children}</main>
          <CompareBar />
          <SiteFooter />
        </SiteThemeShell>
      </PurposeSelectionProvider>
    </CompareProvider>
  );
}
