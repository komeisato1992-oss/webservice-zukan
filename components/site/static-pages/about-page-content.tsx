import Link from "next/link";
import type { DictionarySiteProfile } from "@/lib/site/dictionary-static-pages";
import { dictionaryStaticPagePath } from "@/lib/site/dictionary-static-pages";
import { StaticSection } from "@/components/site/static-page-shell";

type Props = {
  profile: DictionarySiteProfile;
};

export function AboutPageContent({ profile }: Props) {
  return (
    <>
      <StaticSection title="サイト名">
        <p>{profile.brand}</p>
      </StaticSection>

      <StaticSection title="サイト説明">
        <p>{profile.siteDescription}</p>
      </StaticSection>

      <StaticSection title="紹介">
        {profile.aboutIntro.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </StaticSection>

      <StaticSection title="お問い合わせ">
        <p>
          掲載内容に関するご指摘やご質問は、
          <Link
            href={dictionaryStaticPagePath(profile.key, "contact")}
            className="mx-1 text-[var(--accent)] hover:underline"
          >
            お問い合わせページ
          </Link>
          よりご連絡ください。
        </p>
      </StaticSection>
    </>
  );
}
