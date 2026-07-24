import {
  buildDictionaryStaticMetadata,
  generateDictionaryStaticParams,
  resolveDictionaryStaticProfile,
} from "@/lib/site/dictionary-static-page-route";
import { dictionaryStaticPageTitle } from "@/lib/site/dictionary-static-pages";
import { PrivacyPageContent } from "@/components/site/static-pages/privacy-page-content";
import { StaticPageShell } from "@/components/site/static-page-shell";

type Props = { params: Promise<{ categorySlug: string }> };

export function generateStaticParams() {
  return generateDictionaryStaticParams();
}

export async function generateMetadata({ params }: Props) {
  return buildDictionaryStaticMetadata(params, "privacy");
}

export default async function DictionaryPrivacyPage({ params }: Props) {
  const profile = await resolveDictionaryStaticProfile(params);
  const title = dictionaryStaticPageTitle("privacy");

  return (
    <StaticPageShell
      title={title}
      brand={profile.brand}
      homePath={profile.homePath}
    >
      <PrivacyPageContent profile={profile} />
    </StaticPageShell>
  );
}
