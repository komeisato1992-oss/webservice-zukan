import {
  buildDictionaryStaticMetadata,
  generateDictionaryStaticParams,
  resolveDictionaryStaticProfile,
} from "@/lib/site/dictionary-static-page-route";
import { dictionaryStaticPageTitle } from "@/lib/site/dictionary-static-pages";
import { DisclaimerPageContent } from "@/components/site/static-pages/disclaimer-page-content";
import { StaticPageShell } from "@/components/site/static-page-shell";

type Props = { params: Promise<{ categorySlug: string }> };

export function generateStaticParams() {
  return generateDictionaryStaticParams();
}

export async function generateMetadata({ params }: Props) {
  return buildDictionaryStaticMetadata(params, "disclaimer");
}

export default async function DictionaryDisclaimerPage({ params }: Props) {
  const profile = await resolveDictionaryStaticProfile(params);
  const title = dictionaryStaticPageTitle("disclaimer");

  return (
    <StaticPageShell
      title={title}
      brand={profile.brand}
      homePath={profile.homePath}
    >
      <DisclaimerPageContent profile={profile} />
    </StaticPageShell>
  );
}
