import Image from "next/image";
import Link from "next/link";
import type { GuideArticleProps } from "@/lib/guides/types";
import { PRIMARY_CATEGORY_SLUG } from "@/lib/site/brand";
import { categoryPath } from "@/lib/links";
import {
  GuidePageLink,
  GuideServiceLink,
} from "@/components/site/guides/guide-links";
import { GuideServiceCta } from "@/components/site/guides/guide-service-cta";
import { FaqAccordion } from "@/components/site/faq-accordion";
import type { FaqItem } from "@/lib/site/content";
import type { EnrichedService } from "@/lib/site/service-utils";
import { buttonClass, cn } from "@/components/site/ui";

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "法人でもWordPressは利用できますか？",
    answer:
      "はい。企業サイトや採用サイトなどでもWordPressが利用されることがあります。",
  },
  {
    question: "法人向けサーバーは個人向けと何が違いますか？",
    answer:
      "サービスによって提供内容は異なりますが、サポート体制や機能、プラン構成などに違いがあります。必要な機能を比較して選ぶことが大切です。",
  },
];

const RANK_4_TO_5: Array<{
  rank: number;
  slug: string;
  name: string;
  feature: string;
}> = [
  {
    rank: 4,
    slug: "conoha-wing",
    name: "ConoHa WING",
    feature: "個人・法人どちらにも対応しやすいサービスです。",
  },
  {
    rank: 5,
    slug: "iclusta",
    name: "iCLUSTA+",
    feature: "法人向けプランも提供しています。",
  },
];

function bySlug(
  services: EnrichedService[],
  slug: string,
): EnrichedService | undefined {
  return services.find((s) => s.service.slug === slug);
}

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="scroll-mt-24 text-[1.125rem] font-bold text-[var(--text-primary)] sm:text-[1.25rem]"
    >
      {children}
    </h2>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-5 text-[1rem] font-bold text-[var(--text-primary)] sm:text-[1.0625rem]">
      {children}
    </h3>
  );
}

function H4({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="mt-3 text-[0.9375rem] font-semibold text-[var(--text-primary)]">
      {children}
    </h4>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-3">{children}</p>;
}

function Ul({ children }: { children: React.ReactNode }) {
  return <ul className="mt-3 list-disc space-y-1.5 pl-5">{children}</ul>;
}

function Hr() {
  return <hr className="my-2 border-0" />;
}

function GuideFigure({
  src,
  alt,
  priority = false,
}: {
  src: string;
  alt: string;
  priority?: boolean;
}) {
  return (
    <figure className="mt-5 overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-white shadow-[var(--shadow-card)]">
      <Image
        src={src}
        alt={alt}
        width={1024}
        height={682}
        className="h-auto w-full"
        sizes="(max-width: 768px) 100vw, 768px"
        priority={priority}
      />
    </figure>
  );
}

function DetailReviewLink({ slug }: { slug: string }) {
  return (
    <P>
      <Link
        href={categoryPath(PRIMARY_CATEGORY_SLUG, "services", slug)}
        className={cn(
          buttonClass("secondary", "sm"),
          "inline-flex w-auto min-w-[10rem]",
        )}
      >
        詳細レビューを見る
      </Link>
    </P>
  );
}

export function BusinessRentalServerArticle({ services }: GuideArticleProps) {
  const xserver = bySlug(services, "xserver");
  const cpi = bySlug(services, "cpi");
  const kagoya = bySlug(services, "kagoya");

  const compareHref = categoryPath(PRIMARY_CATEGORY_SLUG, "compare");
  const businessRankingHref = `/${PRIMARY_CATEGORY_SLUG}#purpose-business`;

  return (
    <>
      <section>
        <H2 id="intro">法人サイトではレンタルサーバー選びが重要</H2>
        <P>
          企業のホームページや採用サイト、サービス紹介ページを運営する場合、レンタルサーバー選びは重要です。
        </P>
        <P>個人ブログとは異なり、</P>
        <Ul>
          <li>安定した稼働</li>
          <li>セキュリティ</li>
          <li>サポート体制</li>
          <li>バックアップ</li>
          <li>将来的な拡張性</li>
        </Ul>
        <P>などを考慮する必要があります。</P>
        <P>
          この記事では、サーバー図鑑で比較しているサービスの中から、法人利用を検討している方におすすめのレンタルサーバーを紹介します。
        </P>
      </section>

      <Hr />

      <section>
        <H2 id="selection-points">法人向けレンタルサーバーを選ぶポイント</H2>
        <GuideFigure
          src="/images/guides/business-server-selection.jpg"
          alt="法人サイトで重視したい5つのポイント：安定性・セキュリティ・サポート・バックアップ・拡張性"
          priority
        />

        <H3>安定性</H3>
        <P>企業サイトは長時間アクセスできない状態を避けたいものです。</P>
        <P>サービスの実績や稼働状況も比較しながら選びましょう。</P>

        <Hr />

        <H3>サポート体制</H3>
        <P>トラブル時に相談できる体制が整っているかも重要です。</P>
        <P>
          電話・メール・チャットなど、利用できるサポート方法を確認しておきましょう。
        </P>

        <Hr />

        <H3>セキュリティ</H3>
        <P>
          SSLやWAF、バックアップなど、セキュリティ関連の機能も確認しましょう。
        </P>

        <Hr />

        <H3>WordPress対応</H3>
        <P>企業サイトでもWordPressを利用するケースは多くあります。</P>
        <P>
          WordPress簡単インストールや自動バックアップなどの機能があると運用しやすくなります。
        </P>
      </section>

      <Hr />

      <section>
        <H2 id="top3">法人向けおすすめレンタルサーバー3選</H2>

        <H3>
          1位{" "}
          <GuideServiceLink slug="xserver">エックスサーバー</GuideServiceLink>
        </H3>
        <P>
          サーバー図鑑では、総合的なバランスから法人利用にも
          <GuideServiceLink slug="xserver">エックスサーバー</GuideServiceLink>
          をおすすめしています。
        </P>
        <P>
          安定性やサポート体制、WordPress運用のしやすさなどを重視する企業に向いています。
        </P>
        <H4>おすすめの方</H4>
        <Ul>
          <li>コーポレートサイト</li>
          <li>採用サイト</li>
          <li>サービスサイト</li>
        </Ul>
        <GuideServiceCta item={xserver} location="guide_biz_top3_xserver" />
        <DetailReviewLink slug="xserver" />

        <Hr />

        <H3>
          2位 <GuideServiceLink slug="cpi">CPI</GuideServiceLink>
        </H3>
        <P>
          <GuideServiceLink slug="cpi">CPI</GuideServiceLink>
          は法人向けサービスとして長年提供されており、企業利用を検討している方の選択肢の一つです。
        </P>
        <P>
          利用するプランや必要な機能を比較しながら検討するとよいでしょう。
        </P>
        <H4>おすすめの方</H4>
        <Ul>
          <li>中小企業</li>
          <li>法人ホームページ</li>
          <li>サポートを重視したい</li>
        </Ul>
        <GuideServiceCta item={cpi} location="guide_biz_top3_cpi" />
        <DetailReviewLink slug="cpi" />

        <Hr />

        <H3>
          3位 <GuideServiceLink slug="kagoya">KAGOYA</GuideServiceLink>
        </H3>
        <P>
          <GuideServiceLink slug="kagoya">KAGOYA</GuideServiceLink>
          は法人向けサービスも展開しており、ビジネス用途を検討している方にも利用されています。
        </P>
        <H4>おすすめの方</H4>
        <Ul>
          <li>法人利用</li>
          <li>長期運営</li>
          <li>複数サイト運営</li>
        </Ul>
        <GuideServiceCta item={kagoya} location="guide_biz_top3_kagoya" />
        <DetailReviewLink slug="kagoya" />
      </section>

      <Hr />

      <section>
        <H2 id="rank-4-to-5">4位以降の法人向けサーバー</H2>
        <div className="mt-4 overflow-x-auto rounded-[var(--radius-card)] border border-[var(--border)]">
          <table className="w-full min-w-[28rem] border-collapse text-left text-[13px] sm:text-[14px]">
            <thead className="bg-[var(--surface)]">
              <tr>
                <th className="border-b border-[var(--border)] px-3 py-2.5 font-semibold text-[var(--text-primary)]">
                  順位
                </th>
                <th className="border-b border-[var(--border)] px-3 py-2.5 font-semibold text-[var(--text-primary)]">
                  サービス
                </th>
                <th className="border-b border-[var(--border)] px-3 py-2.5 font-semibold text-[var(--text-primary)]">
                  特徴
                </th>
              </tr>
            </thead>
            <tbody>
              {RANK_4_TO_5.map((row) => (
                <tr key={row.slug} className="align-top">
                  <td className="border-b border-[var(--border)] px-3 py-2.5 tabular-nums text-[var(--text-muted)]">
                    {row.rank}位
                  </td>
                  <td className="border-b border-[var(--border)] px-3 py-2.5">
                    <GuideServiceLink slug={row.slug}>
                      {row.name}
                    </GuideServiceLink>
                  </td>
                  <td className="border-b border-[var(--border)] px-3 py-2.5 text-[var(--text-body)]">
                    {row.feature}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <P>
          <GuidePageLink href={businessRankingHref}>
            法人向けランキングをもっと見る
          </GuidePageLink>
        </P>
      </section>

      <Hr />

      <section>
        <H2 id="faq">法人利用でよくある質問</H2>
        <div className="mt-4">
          <FaqAccordion items={FAQ_ITEMS} />
        </div>
      </section>

      <Hr />

      <section>
        <H2 id="summary">まとめ</H2>
        <P>
          法人向けレンタルサーバーを選ぶ際は、料金だけではなく、安定性やサポート体制、セキュリティなども比較しましょう。
        </P>
        <P>
          サーバー図鑑では、
          <GuidePageLink href={businessRankingHref}>
            法人向けランキング
          </GuidePageLink>
          や各サービスの詳細レビューも掲載しています。
        </P>
        <P>
          ぜひ比較しながら、自社に合ったレンタルサーバーを見つけてください。
        </P>
      </section>

      <p className="mt-6 text-[12px] text-[var(--text-muted)]">
        <Link
          href={`/${PRIMARY_CATEGORY_SLUG}`}
          className="hover:text-[var(--accent)]"
        >
          サーバー図鑑TOPへ戻る
        </Link>
        {" / "}
        <Link href="/guides" className="hover:text-[var(--accent)]">
          ガイド一覧
        </Link>
      </p>
    </>
  );
}
