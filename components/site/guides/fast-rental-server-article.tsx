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
    question: "表示速度だけでレンタルサーバーを選んでもいいですか？",
    answer:
      "表示速度は重要な要素ですが、サポートや料金、機能などもあわせて比較することをおすすめします。",
  },
  {
    question: "NVMeなら必ず速いですか？",
    answer:
      "NVMeはストレージの種類の一つで、読み書き性能に関わる要素です。ただし、実際の表示速度はサーバー構成やサイトの作り方など、複数の要因によって変わります。",
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
    slug: "shin-server",
    name: "シンレンタルサーバー",
    feature: "高速性と価格のバランス",
  },
  {
    rank: 5,
    slug: "colorfulbox",
    name: "ColorfulBox",
    feature: "WordPress向け機能も充実",
  },
  {
    rank: 6,
    slug: "coreserver",
    name: "CoreServer",
    feature: "NVMeストレージ採用",
  },
  {
    rank: 7,
    slug: "star-server",
    name: "スターサーバー",
    feature: "個人サイト向け",
  },
  {
    rank: 8,
    slug: "lolipop",
    name: "ロリポップ！",
    feature: "ハイスピードプランあり",
  },
  {
    rank: 9,
    slug: "kagoya",
    name: "KAGOYA",
    feature: "法人利用にも対応",
  },
  {
    rank: 10,
    slug: "sakura",
    name: "さくらのレンタルサーバ",
    feature: "長年の運営実績",
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

export function FastRentalServerArticle({ services }: GuideArticleProps) {
  const conoha = bySlug(services, "conoha-wing");
  const xserver = bySlug(services, "xserver");
  const mixhost = bySlug(services, "mixhost");

  const compareHref = categoryPath(PRIMARY_CATEGORY_SLUG, "compare");
  const speedRankingHref = `/${PRIMARY_CATEGORY_SLUG}#purpose-speed`;

  return (
    <>
      <section>
        <H2 id="intro">表示速度を重視してレンタルサーバーを選びたい方へ</H2>
        <P>
          レンタルサーバーを選ぶ際、「表示速度」を重視する方は少なくありません。
        </P>
        <P>
          ページがスムーズに表示されることは、サイトを訪れたユーザーの使いやすさにもつながります。
        </P>
        <P>
          一方で、レンタルサーバーの速度は、ストレージやサーバー構成、利用状況など複数の要素によって変わるため、「速い」と一言で比較することはできません。
        </P>
        <P>
          この記事では、サーバー図鑑で比較しているサービスの中から、高速性を重視したい方に向いているレンタルサーバーを紹介します。
        </P>
      </section>

      <Hr />

      <section>
        <H2 id="selection-points">高速なレンタルサーバーを選ぶポイント</H2>
        <GuideFigure
          src="/images/guides/speed-server-selection.jpg"
          alt="表示速度に影響する5つのポイント：ストレージ・サーバー性能・キャッシュ・WordPress最適化・サイトの作り方"
          priority
        />

        <H3>ストレージの種類</H3>
        <P>近年はNVMeストレージを採用するレンタルサーバーも増えています。</P>
        <P>
          ストレージの種類は、データの読み書き性能に関わる要素の一つです。
        </P>

        <Hr />

        <H3>WordPress向けの機能</H3>
        <P>WordPressを利用する場合は、</P>
        <Ul>
          <li>WordPress簡単インストール</li>
          <li>キャッシュ機能</li>
          <li>PHP最新版への対応</li>
        </Ul>
        <P>なども確認しておくとよいでしょう。</P>

        <Hr />

        <H3>サーバーの安定性</H3>
        <P>
          アクセスが集中した際にも安定して利用できるかどうかは、長期的なサイト運営では重要です。
        </P>

        <Hr />

        <H3>サポート体制</H3>
        <P>
          万が一トラブルが起きた場合に相談できる窓口があるかも確認しましょう。
        </P>
      </section>

      <Hr />

      <section>
        <H2 id="top3">
          表示速度を重視する方におすすめのレンタルサーバー3選
        </H2>

        <H3>
          1位{" "}
          <GuideServiceLink slug="conoha-wing">ConoHa WING</GuideServiceLink>
        </H3>
        <P>
          サーバー図鑑では、表示速度を重視するランキングで
          <GuideServiceLink slug="conoha-wing">ConoHa WING</GuideServiceLink>
          を1位としています。
        </P>
        <P>
          WordPress関連機能も充実しており、ブログやホームページを運営する方の選択肢の一つです。
        </P>
        <H4>おすすめの方</H4>
        <Ul>
          <li>表示速度を重視したい</li>
          <li>WordPressブログを運営したい</li>
          <li>初心者</li>
        </Ul>
        <GuideServiceCta item={conoha} location="guide_speed_top3_conoha" />
        <DetailReviewLink slug="conoha-wing" />

        <Hr />

        <H3>
          2位{" "}
          <GuideServiceLink slug="xserver">エックスサーバー</GuideServiceLink>
        </H3>
        <P>
          <GuideServiceLink slug="xserver">エックスサーバー</GuideServiceLink>
          は、高速性能と安定性のバランスを重視したい方に向いています。
        </P>
        <P>個人サイトから法人サイトまで幅広く利用されています。</P>
        <H4>おすすめの方</H4>
        <Ul>
          <li>長くサイトを運営したい</li>
          <li>安定性も重視したい</li>
        </Ul>
        <GuideServiceCta item={xserver} location="guide_speed_top3_xserver" />
        <DetailReviewLink slug="xserver" />

        <Hr />

        <H3>
          3位 <GuideServiceLink slug="mixhost">mixhost</GuideServiceLink>
        </H3>
        <P>
          <GuideServiceLink slug="mixhost">mixhost</GuideServiceLink>
          は、高速性を重視したい方から選ばれることがあるレンタルサーバーです。
        </P>
        <P>
          利用目的に応じて他サービスと比較してみるとよいでしょう。
        </P>
        <H4>おすすめの方</H4>
        <Ul>
          <li>ブログ</li>
          <li>アフィリエイト</li>
          <li>表示速度を重視したい</li>
        </Ul>
        <GuideServiceCta item={mixhost} location="guide_speed_top3_mixhost" />
        <DetailReviewLink slug="mixhost" />
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
          <GuidePageLink href={speedRankingHref}>
            高速ランキングをもっと見る
          </GuidePageLink>
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
          表示速度を重視する場合は、ストレージの種類やWordPress向け機能、安定性なども比較して選びましょう。
        </P>
        <P>
          サーバー図鑑では、
          <GuidePageLink href={speedRankingHref}>高速ランキング</GuidePageLink>
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
