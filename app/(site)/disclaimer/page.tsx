import { SITE_BRAND } from "@/lib/site/brand";
import { buildPageMetadata } from "@/lib/site/seo";
import { InfoCallout } from "@/components/site/ui";
import {
  StaticPageShell,
  StaticSection,
} from "@/components/site/static-page-shell";

export const metadata = buildPageMetadata("disclaimer");

export default function DisclaimerPage() {
  return (
    <StaticPageShell title="免責事項" path="/disclaimer">
      <InfoCallout
        title="必ずご確認ください"
        items={[
          "料金・キャンペーン・仕様等は変更される場合があります。",
          "必ず公式サイトで最新情報をご確認ください。",
        ]}
      />

      <StaticSection title="情報の正確性">
        <p>
          {SITE_BRAND}
          に掲載する情報は、各サービスの公式情報などを基に整理・掲載していますが、その正確性・完全性・最新性を保証するものではありません。
        </p>
      </StaticSection>

      <StaticSection title="最新情報は公式サイト優先">
        <p>
          料金・キャンペーン・仕様等は変更される場合があります。必ず公式サイトで最新情報をご確認ください。当サイトの情報と公式サイトの内容に相違がある場合は、公式サイトの情報を優先してください。
        </p>
      </StaticSection>

      <StaticSection title="料金の変更">
        <p>
          各サービスの料金体系は予告なく変更されることがあります。掲載時点の情報と異なる場合があるため、申込・契約前に公式サイトでご確認ください。
        </p>
      </StaticSection>

      <StaticSection title="キャンペーンの変更">
        <p>
          期間限定キャンペーンや特典は、終了・条件変更・対象外となることがあります。適用条件の詳細は各公式サイトをご確認ください。
        </p>
      </StaticSection>

      <StaticSection title="掲載情報の変更">
        <p>
          当サイトは、掲載内容を予告なく追加・修正・削除することがあります。また、掲載の継続を保証するものではありません。
        </p>
      </StaticSection>

      <StaticSection title="損害責任について">
        <p>
          当サイトの情報の利用、または利用できなかったことにより生じた損害について、当サイト運営者は一切の責任を負いません。サービス選定・契約・利用に関する最終判断は、利用者ご自身の責任において行ってください。
        </p>
      </StaticSection>

      <StaticSection title="外部サイトについて">
        <p>
          当サイトからリンクする外部サイトの内容・安全性・プライバシー方針等について、当サイト運営者は責任を負いません。外部サイトのご利用は、各サイトの利用規約・ポリシーに従ってください。
        </p>
      </StaticSection>
    </StaticPageShell>
  );
}
