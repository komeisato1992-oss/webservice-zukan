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
    question: "WordPressだけではサイトを公開できますか？",
    answer:
      "一般的にはレンタルサーバーが必要です。サービスの種類によって構成が異なる場合もありますが、多くのケースではレンタルサーバーと組み合わせて利用します。",
  },
  {
    question: "レンタルサーバーを契約するとWordPressは使えますか？",
    answer:
      "多くのレンタルサーバーではWordPressに対応しています。対応状況や導入方法はサービスによって異なるため、事前に確認しましょう。",
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

function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-3">{children}</p>;
}

function Ul({ children }: { children: React.ReactNode }) {
  return <ul className="mt-3 list-disc space-y-1.5 pl-5">{children}</ul>;
}

function Ol({ children }: { children: React.ReactNode }) {
  return (
    <ol className="mt-3 list-decimal space-y-2 pl-5 marker:font-semibold">
      {children}
    </ol>
  );
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

export function WordpressVsServerArticle({ services }: GuideArticleProps) {
  const xserver = bySlug(services, "xserver");
  const conoha = bySlug(services, "conoha-wing");
  const shin = bySlug(services, "shin-server");

  const compareHref = categoryPath(PRIMARY_CATEGORY_SLUG, "compare");

  return (
    <>
      <section>
        <H2 id="intro">
          「WordPress」と「レンタルサーバー」は何が違う？
        </H2>
        <P>これからホームページやブログを始めようと思ったとき、</P>
        <P>「WordPressって何？」</P>
        <P>「レンタルサーバーって何？」</P>
        <P>「どっちを契約するの？」</P>
        <P>と疑問に思う方も多いのではないでしょうか。</P>
        <P>実は、この2つは役割がまったく異なります。</P>
        <P>
          この記事では、それぞれの違いや役割、ブログ公開までの流れを初心者向けに解説します。
        </P>
      </section>

      <Hr />

      <section>
        <H2 id="what-is-wordpress">WordPressとは？</H2>
        <P>
          WordPressは、ブログやホームページを作成・管理するためのCMS（コンテンツ管理システム）です。
        </P>
        <P>
          文章を書いたり画像を掲載したり、デザインを変更したりと、サイト運営に必要な機能を備えています。
        </P>
        <P>
          WordPress自体はオープンソースソフトウェアとして公開されており、多くのレンタルサーバーで利用できます。
        </P>
      </section>

      <Hr />

      <section>
        <H2 id="what-is-server">レンタルサーバーとは？</H2>
        <P>
          レンタルサーバーは、ホームページやWordPressのデータを保存し、インターネット上で公開するためのサービスです。
        </P>
        <P>
          WordPressだけではWebサイトを公開できないため、一般的にはレンタルサーバーと組み合わせて利用します。
        </P>
      </section>

      <Hr />

      <section>
        <H2 id="difference">WordPressとレンタルサーバーの違い</H2>
        <div className="mt-4 overflow-x-auto rounded-[var(--radius-card)] border border-[var(--border)]">
          <table className="w-full min-w-[28rem] border-collapse text-left text-[13px] sm:text-[14px]">
            <thead className="bg-[var(--surface)]">
              <tr>
                <th className="border-b border-[var(--border)] px-3 py-2.5 font-semibold text-[var(--text-primary)]">
                  項目
                </th>
                <th className="border-b border-[var(--border)] px-3 py-2.5 font-semibold text-[var(--text-primary)]">
                  WordPress
                </th>
                <th className="border-b border-[var(--border)] px-3 py-2.5 font-semibold text-[var(--text-primary)]">
                  レンタルサーバー
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border-b border-[var(--border)] px-3 py-2.5 font-medium text-[var(--text-primary)]">
                  役割
                </td>
                <td className="border-b border-[var(--border)] px-3 py-2.5">
                  サイトを作るソフトウェア
                </td>
                <td className="border-b border-[var(--border)] px-3 py-2.5">
                  サイトを公開する場所
                </td>
              </tr>
              <tr>
                <td className="border-b border-[var(--border)] px-3 py-2.5 font-medium text-[var(--text-primary)]">
                  必要性
                </td>
                <td className="border-b border-[var(--border)] px-3 py-2.5">
                  ブログ運営で利用されることが多い
                </td>
                <td className="border-b border-[var(--border)] px-3 py-2.5">
                  Webサイト公開に必要
                </td>
              </tr>
              <tr>
                <td className="border-b border-[var(--border)] px-3 py-2.5 font-medium text-[var(--text-primary)]">
                  主な機能
                </td>
                <td className="border-b border-[var(--border)] px-3 py-2.5">
                  記事作成・デザイン・管理
                </td>
                <td className="border-b border-[var(--border)] px-3 py-2.5">
                  データ保存・公開・通信
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <Hr />

      <section>
        <H2 id="domain">ドメインも必要？</H2>
        <P>Webサイトを公開するには、一般的に</P>
        <Ul>
          <li>ドメイン</li>
          <li>レンタルサーバー</li>
          <li>WordPress</li>
        </Ul>
        <P>の3つを組み合わせて利用します。</P>
        <P>ドメインは、インターネット上の住所のような役割を持ちます。</P>
        <GuideFigure
          src="/images/guides/wordpress-vs-server.jpg"
          alt="ホームページ公開の仕組み：ドメイン（住所）・レンタルサーバー（土地）・WordPress（家）の関係"
          priority
        />
      </section>

      <Hr />

      <section>
        <H2 id="flow">ブログ公開までの流れ</H2>
        <Ol>
          <li>レンタルサーバーを契約</li>
          <li>ドメインを取得</li>
          <li>WordPressをインストール</li>
          <li>初期設定</li>
          <li>記事を書く</li>
          <li>サイト公開</li>
        </Ol>
      </section>

      <Hr />

      <section>
        <H2 id="recommended">初心者におすすめのレンタルサーバー3選</H2>

        <H3>
          <GuideServiceLink slug="xserver">エックスサーバー</GuideServiceLink>
        </H3>
        <P>
          初めてWordPressを始める方にも選ばれているレンタルサーバーです。
        </P>
        <GuideServiceCta item={xserver} location="guide_wp_vs_xserver" />
        <DetailReviewLink slug="xserver" />

        <Hr />

        <H3>
          <GuideServiceLink slug="conoha-wing">ConoHa WING</GuideServiceLink>
        </H3>
        <P>
          WordPress関連機能が充実しており、初心者にも利用しやすいサービスです。
        </P>
        <GuideServiceCta item={conoha} location="guide_wp_vs_conoha" />
        <DetailReviewLink slug="conoha-wing" />

        <Hr />

        <H3>
          <GuideServiceLink slug="shin-server">
            シンレンタルサーバー
          </GuideServiceLink>
        </H3>
        <P>
          高性能と料金のバランスを重視したい方の選択肢になります。
        </P>
        <GuideServiceCta item={shin} location="guide_wp_vs_shin" />
        <DetailReviewLink slug="shin-server" />
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
          WordPressはサイトを作るためのソフトウェア、レンタルサーバーはそのサイトを公開するための場所です。
        </P>
        <P>
          それぞれの役割を理解して、自分に合ったレンタルサーバーを選びましょう。
        </P>
        <P>
          サーバー図鑑では、レンタルサーバーの
          <GuidePageLink href={compareHref}>比較</GuidePageLink>
          やランキング、各サービスの詳細レビューも掲載しています。ぜひあわせてご覧ください。
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
