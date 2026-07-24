import Link from "next/link";
import type { DictionarySiteProfile } from "@/lib/site/dictionary-static-pages";
import { dictionaryStaticPagePath } from "@/lib/site/dictionary-static-pages";
import { StaticSection } from "@/components/site/static-page-shell";

type Props = {
  profile: DictionarySiteProfile;
};

export function OperatorPageContent({ profile }: Props) {
  return (
    <>
      <StaticSection title="サイト名">
        <p>{profile.brand}</p>
      </StaticSection>

      <StaticSection title="運営目的">
        <p>
          {profile.serviceLabel}
          選びで必要な情報を、同じ観点で見比べられる形にまとめ、利用者が目的に合ったサービスを検討しやすくすることを目的としています。
        </p>
      </StaticSection>

      <StaticSection title="情報取得方針">
        <p>
          各サービスの公式サイトや公開資料を確認し、
          {profile.compareAspects}
          などの項目を整理して掲載しています。推測や未確認の情報は掲載しないよう努めています。
        </p>
      </StaticSection>

      <StaticSection title="更新方針">
        <p>
          料金改定やキャンペーン変更、仕様変更などを把握できた場合に、掲載内容の見直し・更新を行います。ただし、すべての変更を即座に反映できるとは限らないため、最新情報は各公式サイトをご確認ください。
        </p>
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
        <p className="text-[13px] text-[var(--text-muted)]">
          ※運営者の住所・電話番号等の個人情報は公開していません。
        </p>
      </StaticSection>
    </>
  );
}
