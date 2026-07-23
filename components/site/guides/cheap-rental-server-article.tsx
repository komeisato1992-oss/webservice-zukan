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
    question: "安いレンタルサーバーでもWordPressは使えますか？",
    answer:
      "多くのレンタルサーバーでWordPressに対応しています。対応状況や機能はサービスによって異なるため、事前に確認しましょう。",
  },
  {
    question: "月額料金以外に必要な費用はありますか？",
    answer:
      "一般的には、レンタルサーバー代のほかにドメイン代が必要です。また、契約プランによっては初期費用が発生する場合があります。",
  },
];

const RANK_4_TO_10: Array<{
  rank: number;
  slug: string;
  name: string;
  feature: string;
}> = [
  {
    rank: 4,
    slug: "conoha-wing",
    name: "ConoHa WING",
    feature: "料金と性能のバランスが良い",
  },
  {
    rank: 5,
    slug: "shin-server",
    name: "シンレンタルサーバー",
    feature: "高性能と価格のバランス",
  },
  {
    rank: 6,
    slug: "colorfulbox",
    name: "ColorfulBox",
    feature: "バックアップ機能が充実",
  },
  {
    rank: 7,
    slug: "coreserver",
    name: "CoreServer",
    feature: "複数サイト向け",
  },
  {
    rank: 8,
    slug: "sakura",
    name: "さくらのレンタルサーバ",
    feature: "運営実績が豊富",
  },
  {
    rank: 9,
    slug: "rakko-server",
    name: "ラッコサーバー",
    feature: "WordPressにも対応",
  },
  {
    rank: 10,
    slug: "mixhost",
    name: "mixhost",
    feature: "高速表示を重視したい方向け",
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

export function CheapRentalServerArticle({ services }: GuideArticleProps) {
  const lolipop = bySlug(services, "lolipop");
  const star = bySlug(services, "star-server");
  const xrea = bySlug(services, "xrea");

  const compareHref = categoryPath(PRIMARY_CATEGORY_SLUG, "compare");
  const cheapRankingHref = `/${PRIMARY_CATEGORY_SLUG}#purpose-cheap`;

  return (
    <>
      <section>
        <H2 id="intro">安いレンタルサーバーを探していませんか？</H2>
        <P>
          「できるだけ費用を抑えてブログやホームページを始めたい」
        </P>
        <P>
          そんな方にとって、月額料金はレンタルサーバー選びの重要なポイントです。
        </P>
        <P>ただし、料金だけで選ぶと、</P>
        <Ul>
          <li>必要な機能が足りない</li>
          <li>サポートが十分でない</li>
          <li>将来的にプラン変更が必要になる</li>
        </Ul>
        <P>といったケースもあります。</P>
        <P>
          この記事では、料金だけではなく、機能や使いやすさも考慮しながら、月額料金が比較的安いレンタルサーバーを紹介します。
        </P>
      </section>

      <Hr />

      <section>
        <H2 id="selection-points">格安レンタルサーバーを選ぶポイント</H2>
        <GuideFigure
          src="/images/guides/cheap-server-selection.jpg"
          alt="安いレンタルサーバーの選び方：月額料金・初期費用・機能・WordPress・サポートを確認するポイント"
          priority
        />

        <H3>月額料金だけで判断しない</H3>
        <P>月額料金が安くても、</P>
        <Ul>
          <li>容量</li>
          <li>バックアップ</li>
          <li>サポート</li>
          <li>WordPress対応</li>
        </Ul>
        <P>などを比較することが大切です。</P>

        <Hr />

        <H3>初期費用も確認する</H3>
        <P>サービスによっては初期費用が発生する場合があります。</P>
        <P>契約前に総額を確認しておきましょう。</P>

        <Hr />

        <H3>更新料金も確認する</H3>
        <P>
          キャンペーン価格だけではなく、更新時の料金も確認しておくと安心です。
        </P>

        <Hr />

        <H3>WordPress対応を確認する</H3>
        <P>
          ブログを始める予定なら、WordPress簡単インストール機能があるサービスを選ぶと導入しやすくなります。
        </P>
      </section>

      <Hr />

      <section>
        <H2 id="top3">月額料金が安いおすすめレンタルサーバー3選</H2>

        <H3>
          1位 <GuideServiceLink slug="lolipop">ロリポップ！</GuideServiceLink>
        </H3>
        <P>
          サーバー図鑑では、料金と機能のバランスから
          <GuideServiceLink slug="lolipop">ロリポップ！</GuideServiceLink>
          をおすすめしています。
        </P>
        <P>
          比較的低価格なプランがあり、個人ブログや小規模サイトの選択肢になります。
        </P>
        <H4>おすすめの方</H4>
        <Ul>
          <li>初めてブログを作る</li>
          <li>費用を抑えたい</li>
          <li>個人サイトを運営したい</li>
        </Ul>
        <GuideServiceCta item={lolipop} location="guide_cheap_top3_lolipop" />
        <DetailReviewLink slug="lolipop" />

        <Hr />

        <H3>
          2位{" "}
          <GuideServiceLink slug="star-server">スターサーバー</GuideServiceLink>
        </H3>
        <P>
          <GuideServiceLink slug="star-server">スターサーバー</GuideServiceLink>
          は、比較的低価格な料金帯とシンプルなプランが特徴です。
        </P>
        <P>個人利用や趣味のサイトにも向いています。</P>
        <H4>おすすめの方</H4>
        <Ul>
          <li>小規模サイト</li>
          <li>趣味のブログ</li>
          <li>コスト重視</li>
        </Ul>
        <GuideServiceCta item={star} location="guide_cheap_top3_star" />
        <DetailReviewLink slug="star-server" />

        <Hr />

        <H3>
          3位 <GuideServiceLink slug="xrea">XREA</GuideServiceLink>
        </H3>
        <P>
          <GuideServiceLink slug="xrea">XREA</GuideServiceLink>
          は、コストを重視する方にとって候補の一つとなるレンタルサーバーです。
        </P>
        <P>利用目的に合わせてプランを比較するとよいでしょう。</P>
        <H4>おすすめの方</H4>
        <Ul>
          <li>とにかく費用を抑えたい</li>
          <li>小規模サイトを運営したい</li>
        </Ul>
        <GuideServiceCta item={xrea} location="guide_cheap_top3_xrea" />
        <DetailReviewLink slug="xrea" />
      </section>

      <Hr />

      <section>
        <H2 id="rank-4-to-10">4位以降のおすすめ</H2>
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
              {RANK_4_TO_10.map((row) => (
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
          <GuidePageLink href={cheapRankingHref}>
            月額料金ランキングをもっと見る
          </GuidePageLink>
        </P>
      </section>

      <Hr />

      <section>
        <H2 id="who-for">格安サーバーはどんな人におすすめ？</H2>
        <Ul>
          <li>初めてブログを始める</li>
          <li>趣味のホームページを作る</li>
          <li>個人サイトを運営する</li>
          <li>コストを抑えて始めたい</li>
        </Ul>
        <P>
          このような方には、格安レンタルサーバーも選択肢になります。
        </P>
        <P>
          一方で、アクセス数が多いサイトや法人サイトでは、性能やサポートもあわせて比較することをおすすめします。
        </P>
      </section>

      <Hr />

      <section>
        <H2 id="faq">よくある質問</H2>
        <div className="mt-4">
          <FaqAccordion items={FAQ_ITEMS} />
        </div>
      </section>

      <Hr />

      <section>
        <H2 id="summary">まとめ</H2>
        <P>
          格安レンタルサーバーを選ぶ際は、月額料金だけではなく、WordPress対応やサポート体制、バックアップ機能なども比較することが大切です。
        </P>
        <P>
          サーバー図鑑では、
          <GuidePageLink href={cheapRankingHref}>
            月額料金ランキング
          </GuidePageLink>
          や各サービスの詳細レビューも掲載しています。
        </P>
        <P>
          気になるサービスがあれば、ぜひ
          <GuidePageLink href={compareHref}>比較ページ</GuidePageLink>
          もご覧ください。
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
