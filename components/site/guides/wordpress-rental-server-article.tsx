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
    question: "WordPressは無料ですか？",
    answer:
      "WordPress本体はオープンソースソフトウェアとして公開されています。ただし、一般的にはレンタルサーバーやドメインの契約が必要です。",
  },
  {
    question: "初心者でもWordPressは始められますか？",
    answer:
      "多くのレンタルサーバーでは、WordPress簡単インストール機能が提供されており、初めての方でも始めやすくなっています。",
  },
  {
    question: "WordPress向けレンタルサーバーはどう選べばいいですか？",
    answer:
      "料金だけでなく、WordPress対応状況・表示速度・バックアップ・サポート体制などを比較しながら選ぶことをおすすめします。",
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
    slug: "mixhost",
    name: "mixhost",
    feature: "表示速度を重視したい方に向いています。",
  },
  {
    rank: 5,
    slug: "lolipop",
    name: "ロリポップ！",
    feature: "比較的始めやすい料金プランがあります。",
  },
  {
    rank: 6,
    slug: "colorfulbox",
    name: "ColorfulBox",
    feature: "バックアップ機能などが充実しています。",
  },
  {
    rank: 7,
    slug: "star-server",
    name: "スターサーバー",
    feature: "個人サイト向けの選択肢の一つです。",
  },
  {
    rank: 8,
    slug: "coreserver",
    name: "CoreServer",
    feature: "複数サイトを運営したい方にも利用されています。",
  },
  {
    rank: 9,
    slug: "sakura",
    name: "さくらのレンタルサーバ",
    feature: "長年の運営実績があります。",
  },
  {
    rank: 10,
    slug: "kagoya",
    name: "KAGOYA",
    feature: "法人利用も視野に入れたサービスです。",
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
  width,
  height,
  priority = false,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
}) {
  return (
    <figure className="mt-5 overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-white shadow-[var(--shadow-card)]">
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
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

export function WordpressRentalServerArticle({
  services,
}: GuideArticleProps) {
  const xserver = bySlug(services, "xserver");
  const conoha = bySlug(services, "conoha-wing");
  const shin = bySlug(services, "shin-server");

  const compareHref = categoryPath(PRIMARY_CATEGORY_SLUG, "compare");
  const wordpressRankingHref = `/${PRIMARY_CATEGORY_SLUG}#purpose-wordpress`;

  return (
    <>
      <section>
        <H2 id="intro">WordPressを始めるならレンタルサーバー選びが重要</H2>
        <P>
          WordPressは、ブログやホームページを作成できるCMS（コンテンツ管理システム）です。多くのレンタルサーバーがWordPressに対応していますが、サービスによって料金や機能、サポート体制は異なります。
        </P>
        <P>初めてWordPressを利用する方は、</P>
        <Ul>
          <li>どのレンタルサーバーを選べばいいの？</li>
          <li>表示速度は重要？</li>
          <li>初心者でも使いやすい？</li>
        </Ul>
        <P>と迷うことも多いでしょう。</P>
        <P>
          この記事では、サーバー図鑑で比較しているサービスの中から、WordPress運営におすすめのレンタルサーバーを紹介します。
        </P>
        <GuideFigure
          src="/images/guides/wordpress-how-it-works.jpg"
          alt="WordPressが動く仕組み：ドメイン取得からレンタルサーバー契約、インストール、設定、サイト公開までの流れ"
          width={1024}
          height={819}
          priority
        />
      </section>

      <Hr />

      <section>
        <H2 id="selection-points">
          WordPress向けレンタルサーバーを選ぶポイント
        </H2>
        <P>レンタルサーバーを比較する際は、次のポイントを確認しましょう。</P>

        <H3>WordPress簡単インストール</H3>
        <P>
          多くのレンタルサーバーでは、WordPressを簡単に導入できる機能を提供しています。
        </P>
        <P>
          初めて利用する方は、この機能があるサービスを選ぶとスムーズです。
        </P>

        <Hr />

        <H3>表示速度</H3>
        <P>
          表示速度はサイトを訪れるユーザーの利便性に関わる重要なポイントです。
        </P>
        <P>
          レンタルサーバーによって採用しているストレージやシステム構成が異なるため、速度面も比較しておくと安心です。
        </P>

        <Hr />

        <H3>自動バックアップ</H3>
        <P>
          万が一のトラブルに備えて、自動バックアップ機能の有無も確認しておきましょう。
        </P>

        <Hr />

        <H3>サポート体制</H3>
        <P>
          メール・電話・チャットなど、困ったときに相談できる窓口があるかも確認しておきたいポイントです。
        </P>
      </section>

      <Hr />

      <section>
        <H2 id="top3">WordPressにおすすめのレンタルサーバー3選</H2>

        <H3>
          1位{" "}
          <GuideServiceLink slug="xserver">エックスサーバー</GuideServiceLink>
        </H3>
        <P>
          サーバー図鑑では、総合的なバランスから
          <GuideServiceLink slug="xserver">エックスサーバー</GuideServiceLink>
          を1位としています。
        </P>
        <P>
          高速性能や安定性、サポート体制などのバランスが良く、WordPressを初めて利用する方から、長期的にサイトを運営したい方まで幅広く選択肢になります。
        </P>
        <H4>おすすめの方</H4>
        <Ul>
          <li>初めてWordPressを使う</li>
          <li>ブログを長く運営したい</li>
          <li>安定性を重視したい</li>
        </Ul>
        <GuideServiceCta item={xserver} location="guide_wp_top3_xserver" />
        <DetailReviewLink slug="xserver" />

        <Hr />

        <H3>
          2位{" "}
          <GuideServiceLink slug="conoha-wing">ConoHa WING</GuideServiceLink>
        </H3>
        <P>
          <GuideServiceLink slug="conoha-wing">ConoHa WING</GuideServiceLink>
          は、使いやすい管理画面とWordPress関連機能が充実しているレンタルサーバーです。
        </P>
        <P>
          表示速度を重視したい方や、初心者でも分かりやすい管理画面を求める方に向いています。
        </P>
        <H4>おすすめの方</H4>
        <Ul>
          <li>ブログを始めたい</li>
          <li>管理画面の使いやすさを重視したい</li>
          <li>表示速度も重視したい</li>
        </Ul>
        <GuideServiceCta item={conoha} location="guide_wp_top3_conoha" />
        <DetailReviewLink slug="conoha-wing" />

        <Hr />

        <H3>
          3位{" "}
          <GuideServiceLink slug="shin-server">
            シンレンタルサーバー
          </GuideServiceLink>
        </H3>
        <P>
          <GuideServiceLink slug="shin-server">
            シンレンタルサーバー
          </GuideServiceLink>
          は、高性能とコストパフォーマンスのバランスが魅力です。
        </P>
        <P>
          比較的新しい技術を取り入れながら、WordPressサイトも快適に運営しやすい環境を提供しています。
        </P>
        <H4>おすすめの方</H4>
        <Ul>
          <li>コストも重視したい</li>
          <li>高性能なサーバーを探している</li>
          <li>複数サイトを運営したい</li>
        </Ul>
        <GuideServiceCta item={shin} location="guide_wp_top3_shin" />
        <DetailReviewLink slug="shin-server" />
      </section>

      <Hr />

      <section>
        <H2 id="rank-4-to-10">4位以降のおすすめレンタルサーバー</H2>
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
          <GuidePageLink href={wordpressRankingHref}>
            WordPress向けランキングをもっと見る
          </GuidePageLink>
        </P>
      </section>

      <Hr />

      <section>
        <H2 id="for-beginners">初心者におすすめなのは？</H2>
        <P>初めてWordPressを利用する場合は、</P>
        <Ul>
          <li>
            <GuideServiceLink slug="xserver">エックスサーバー</GuideServiceLink>
          </li>
          <li>
            <GuideServiceLink slug="conoha-wing">ConoHa WING</GuideServiceLink>
          </li>
          <li>
            <GuideServiceLink slug="shin-server">
              シンレンタルサーバー
            </GuideServiceLink>
          </li>
        </Ul>
        <P>の3社を比較してみるのがおすすめです。</P>
        <P>
          料金だけではなく、管理画面の使いやすさやサポート体制も比較すると、自分に合ったサービスを選びやすくなります。
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
          WordPress向けレンタルサーバーを選ぶ際は、料金だけではなく、表示速度やサポート体制、バックアップ機能なども確認することが大切です。
        </P>
        <P>
          サーバー図鑑では、各レンタルサーバーの詳細レビューや
          <GuidePageLink href={compareHref}>比較ページ</GuidePageLink>
          も掲載しています。
        </P>
        <P>
          気になるサービスがあれば、ぜひ
          <GuidePageLink href={wordpressRankingHref}>
            ランキングページ
          </GuidePageLink>
          やサービス詳細ページもあわせてご覧ください。
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
