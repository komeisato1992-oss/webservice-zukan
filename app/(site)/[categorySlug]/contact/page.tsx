import {
  buildDictionaryStaticMetadata,
  generateDictionaryStaticParams,
  resolveDictionaryStaticProfile,
} from "@/lib/site/dictionary-static-page-route";
import { dictionaryStaticPageTitle } from "@/lib/site/dictionary-static-pages";
import { ContactPageContent } from "@/components/site/static-pages/contact-page-content";
import { StaticPageShell } from "@/components/site/static-page-shell";

type Props = { params: Promise<{ categorySlug: string }> };

export function generateStaticParams() {
  return generateDictionaryStaticParams();
}

export async function generateMetadata({ params }: Props) {
  return buildDictionaryStaticMetadata(params, "contact");
}

export default async function DictionaryContactPage({ params }: Props) {
  const profile = await resolveDictionaryStaticProfile(params);
  const title = dictionaryStaticPageTitle("contact");

  return (
    <StaticPageShell
      title={title}
      brand={profile.brand}
      homePath={profile.homePath}
    >
      <ContactPageContent />
    </StaticPageShell>
  );
}
