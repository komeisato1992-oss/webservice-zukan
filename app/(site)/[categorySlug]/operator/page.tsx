import {
  buildDictionaryStaticMetadata,
  generateDictionaryStaticParams,
  resolveDictionaryStaticProfile,
} from "@/lib/site/dictionary-static-page-route";
import { dictionaryStaticPageTitle } from "@/lib/site/dictionary-static-pages";
import { OperatorPageContent } from "@/components/site/static-pages/operator-page-content";
import { StaticPageShell } from "@/components/site/static-page-shell";

type Props = { params: Promise<{ categorySlug: string }> };

export function generateStaticParams() {
  return generateDictionaryStaticParams();
}

export async function generateMetadata({ params }: Props) {
  return buildDictionaryStaticMetadata(params, "operator");
}

export default async function DictionaryOperatorPage({ params }: Props) {
  const profile = await resolveDictionaryStaticProfile(params);
  const title = dictionaryStaticPageTitle("operator");

  return (
    <StaticPageShell
      title={title}
      brand={profile.brand}
      homePath={profile.homePath}
    >
      <OperatorPageContent profile={profile} />
    </StaticPageShell>
  );
}
