import Link from "next/link";
import { SITE_BRAND } from "@/lib/site/brand";
import { buildPageMetadata } from "@/lib/site/seo";
import {
  StaticPageShell,
  StaticSection,
} from "@/components/site/static-page-shell";

export const metadata = buildPageMetadata("about");

export default function AboutPage() {
  return (
    <StaticPageShell title="運営者情報" path="/about">
      <StaticSection title="サイト名">
        <p>{SITE_BRAND}</p>
      </StaticSection>

      <StaticSection title="サイト概要">
        <p>
          {SITE_BRAND}
          は、レンタルサーバー各社の料金・容量・機能・サポートなどを整理し、比較しやすく提供する情報サイトです。
        </p>
        <p>
          掲載情報は公式サイトを基に確認していますが、契約前には必ず公式サイトをご確認ください。
        </p>
      </StaticSection>

      <StaticSection title="運営目的">
        <p>
          レンタルサーバー選びで必要な情報を、同じ観点で見比べられる形にまとめ、利用者が目的に合ったサービスを検討しやすくすることを目的としています。
        </p>
      </StaticSection>

      <StaticSection title="情報取得方針">
        <p>
          各サービスの公式サイトや公開資料を確認し、料金・容量・機能・サポートなどの項目を整理して掲載しています。推測や未確認の情報は掲載しないよう努めています。
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
            href="/contact"
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
    </StaticPageShell>
  );
}
