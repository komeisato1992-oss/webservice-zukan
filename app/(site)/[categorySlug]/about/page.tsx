import {
  buildDictionaryStaticMetadata,
  generateDictionaryStaticParams,
  resolveDictionaryStaticProfile,
} from "@/lib/site/dictionary-static-page-route";
import { dictionaryStaticPageTitle } from "@/lib/site/dictionary-static-pages";
import { AboutPageContent } from "@/components/site/static-pages/about-page-content";
import { StaticPageShell } from "@/components/site/static-page-shell";

type Props = { params: Promise<{ categorySlug: string }> };

export function generateStaticParams() {
  return generateDictionaryStaticParams();
}

export async function generateMetadata({ params }: Props) {
  return buildDictionaryStaticMetadata(params, "about");
}

export default async function DictionaryAboutPage({ params }: Props) {
  const profile = await resolveDictionaryStaticProfile(params);
  const title = dictionaryStaticPageTitle("about");

  return (
    <StaticPageShell
      title={title}
      brand={profile.brand}
      homePath={profile.homePath}
    >
      <AboutPageContent profile={profile} />
    </StaticPageShell>
  );
}
