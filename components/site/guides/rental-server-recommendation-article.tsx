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

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "レンタルサーバーは初心者でも契約できますか？",
    answer:
      "はい。現在のレンタルサーバーはWordPress簡単インストール機能があり、初心者でも簡単にブログやホームページを始められます。",
  },
  {
    question: "無料サーバーでも大丈夫ですか？",
    answer:
      "学習目的であれば利用できますが、本格的なブログ運営や企業サイトには有料レンタルサーバーがおすすめです。",
  },
  {
    question: "WordPressに一番おすすめなのは？",
    answer:
      "総合的にはエックスサーバーがおすすめです。速度・安定性・サポートのバランスが非常に優れています。",
  },
  {
    question: "表示速度はSEOに影響しますか？",
    answer:
      "はい。ページ表示速度はユーザー体験に影響し、Googleも評価要素の一つとして扱っています。高速なサーバーを選ぶことで、快適なサイト運営につながります。",
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

export function RentalServerRecommendationArticle({
  services,
}: GuideArticleProps) {
  const xserver = bySlug(services, "xserver");
  const conoha = bySlug(services, "conoha-wing");
  const shin = bySlug(services, "shin-server");
  const mixhost = bySlug(services, "mixhost");
  const colorfulbox = bySlug(services, "colorfulbox");
  const sakura = bySlug(services, "sakura");
  const lolipop = bySlug(services, "lolipop");
  const kagoya = bySlug(services, "kagoya");
  const coreserver = bySlug(services, "coreserver");
  const star = bySlug(services, "star-server");
  const cpi = bySlug(services, "cpi");

  const compareHref = categoryPath(PRIMARY_CATEGORY_SLUG, "compare");

  return (
    <>
      <section>
        <H2 id="intro">レンタルサーバー選びで迷っていませんか？</H2>
        <P>ブログやホームページを始めるには、レンタルサーバーが必要です。</P>
        <P>しかし、国内には多くのレンタルサーバーがあり、</P>
        <Ul>
          <li>どれを選べばいいの？</li>
          <li>安いサーバーでも大丈夫？</li>
          <li>WordPressにおすすめなのは？</li>
          <li>表示速度は重要なの？</li>
        </Ul>
        <P>と悩む方も多いでしょう。</P>
        <P>
          実際、レンタルサーバーは一度契約すると数年単位で利用するケースが多いため、最初の選択が非常に重要です。
        </P>
        <P>
          この記事では、サーバー図鑑で掲載している主要レンタルサーバーを比較し、それぞれの特徴やおすすめの利用シーンを紹介します。
        </P>
      </section>

      <section>
        <H2 id="what-you-learn">この記事で分かること</H2>
        <Ul>
          <li>おすすめのレンタルサーバーランキング</li>
          <li>初心者向けサーバーの選び方</li>
          <li>WordPressに強いサーバー</li>
          <li>表示速度の速いサーバー</li>
          <li>コスパの良いサーバー</li>
          <li>法人利用におすすめのサーバー</li>
        </Ul>
        <GuideFigure
          src="/images/guides/selection-flow.jpg"
          alt="レンタルサーバー選びの流れ：ブログとホームページ制作の目的に合わせた選び方のフローチャート"
          priority
        />
      </section>

      <Hr />

      <section>
        <H2 id="conclusion-top3">結論｜迷ったらこの3社がおすすめ</H2>
        <P>
          「結局どれを選べばいいの？」という方には、次の3社がおすすめです。
        </P>
        <GuideFigure
          src="/images/guides/top3-comparison.jpg"
          alt="主要3社の特徴を比較：エックスサーバー・ConoHa WING・シンレンタルサーバーのおすすめポイント"
        />

        <H3>
          1位{" "}
          <GuideServiceLink slug="xserver">エックスサーバー</GuideServiceLink>
        </H3>
        <P>
          <GuideServiceLink slug="xserver">エックスサーバー</GuideServiceLink>
          は国内シェアトップクラスを誇るレンタルサーバーです。
        </P>
        <P>
          高速性能・安定性・サポート体制のバランスが非常によく、初心者から法人まで幅広いユーザーにおすすめできます。
        </P>
        <H4>おすすめな人</H4>
        <Ul>
          <li>初めてブログを始める</li>
          <li>WordPressを利用したい</li>
          <li>長く安心して運営したい</li>
        </Ul>
        <GuideServiceCta item={xserver} location="guide_top3_xserver" />

        <Hr />

        <H3>
          2位{" "}
          <GuideServiceLink slug="conoha-wing">ConoHa WING</GuideServiceLink>
        </H3>
        <P>
          <GuideServiceLink slug="conoha-wing">ConoHa WING</GuideServiceLink>
          は表示速度に優れ、管理画面も使いやすい人気サーバーです。
        </P>
        <P>
          WordPressブログとの相性が非常によく、初心者でも数分でサイトを公開できます。
        </P>
        <H4>おすすめな人</H4>
        <Ul>
          <li>SEOを重視したい</li>
          <li>アフィリエイトブログを始めたい</li>
          <li>高速サーバーを利用したい</li>
        </Ul>
        <GuideServiceCta item={conoha} location="guide_top3_conoha" />

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
          は最新技術を積極的に採用した高性能レンタルサーバーです。
        </P>
        <P>
          高速でありながら料金も比較的リーズナブルなため、コストパフォーマンスに優れています。
        </P>
        <H4>おすすめな人</H4>
        <Ul>
          <li>表示速度を重視したい</li>
          <li>コスパ重視</li>
          <li>WordPress運営を快適にしたい</li>
        </Ul>
        <GuideServiceCta item={shin} location="guide_top3_shin" />
      </section>

      <Hr />

      <section>
        <H2 id="selection-points">
          レンタルサーバー選びで失敗しない7つのポイント
        </H2>
        <GuideFigure
          src="/images/guides/beginner-7-points.jpg"
          alt="初心者が見るべきレンタルサーバー選びの7つのポイント：料金・速度・WordPress・サポート・バックアップ・容量・マルチドメイン"
        />

        <H3>1. 月額料金</H3>
        <P>
          長く続けるためにも、無理なく支払える料金プランを選びましょう。初期費用や更新料金も要チェックです。
        </P>
        <P>
          「月額300円だからお得」と思って契約すると、表示速度やサポート体制に不満を感じるケースがあります。料金だけでなく、機能や安定性も確認しましょう。
        </P>

        <Hr />

        <H3>2. 表示速度</H3>
        <P>
          表示速度はユーザーの満足度やSEOにも影響します。高速なサーバーを選びましょう。
        </P>
        <P>
          最近ではNVMeストレージを採用したサーバーも増えており、従来のSSDより高速な読み書きが期待できます。
        </P>

        <Hr />

        <H3>3. WordPress対応</H3>
        <P>
          WordPress簡単インストール機能があると、初心者でもすぐにブログを始められます。
        </P>
        <P>WordPressを使うなら、</P>
        <Ul>
          <li>WordPress簡単インストール</li>
          <li>自動アップデート</li>
          <li>自動バックアップ</li>
        </Ul>
        <P>などの機能があるサーバーがおすすめです。</P>

        <Hr />

        <H3>4. サポート体制</H3>
        <P>
          困ったときにすぐ相談できるサポートがあると安心です。電話・チャット対応があると特に心強いでしょう。
        </P>
        <P>
          初心者の場合は、電話やチャット、メールなど複数のサポート手段があるサーバーを選ぶと安心です。
        </P>

        <Hr />

        <H3>5. 自動バックアップ</H3>
        <P>
          万が一のトラブルや誤操作でも、自動バックアップがあれば安心して復元できます。
        </P>
        <P>
          バックアップが有料オプションのサービスもあるため、標準で使えるか事前に確認しておきましょう。
        </P>

        <Hr />

        <H3>6. 容量・転送量</H3>
        <P>
          画像や動画を多く使う場合は、十分な容量と転送量があるか確認しておきましょう。
        </P>
        <P>
          ブログが成長したり、複数サイトを運営したりする可能性がある場合は、余裕のあるプランを選ぶと安心です。
        </P>

        <Hr />

        <H3>7. マルチドメイン</H3>
        <P>
          複数のサイトを運営する予定があるなら、マルチドメイン対応か確認しましょう。
        </P>
        <P>
          あわせて、プラン変更のしやすさなど、将来の拡張性も確認しておくと安心です。
        </P>
      </section>

      <Hr />

      <section>
        <H2 id="top10">おすすめレンタルサーバー10選</H2>
        <P>
          ここでは、2026年時点でおすすめできるレンタルサーバーをランキング形式で紹介します。
        </P>

        <H3>
          1位{" "}
          <GuideServiceLink slug="xserver">エックスサーバー</GuideServiceLink>
        </H3>
        <H4>特徴</H4>
        <P>
          <GuideServiceLink slug="xserver">エックスサーバー</GuideServiceLink>
          は国内トップクラスのシェアを誇るレンタルサーバーです。
        </P>
        <P>
          高速性能・安定性・サポート体制のバランスが非常によく、初心者から法人まで幅広いユーザーにおすすめできます。
        </P>
        <H4>メリット</H4>
        <Ul>
          <li>国内トップクラスの高速性能</li>
          <li>WordPressとの相性が良い</li>
          <li>自動バックアップ標準搭載</li>
          <li>電話サポート対応</li>
          <li>長年の運営実績</li>
        </Ul>
        <H4>デメリット</H4>
        <Ul>
          <li>最安クラスではない</li>
          <li>高機能な分、初心者には機能が多く感じることもある</li>
        </Ul>
        <H4>こんな人におすすめ</H4>
        <Ul>
          <li>ブログ運営</li>
          <li>アフィリエイト</li>
          <li>企業サイト</li>
          <li>初心者</li>
        </Ul>
        <GuideServiceCta item={xserver} location="guide_top10_xserver" />

        <Hr />

        <H3>
          2位{" "}
          <GuideServiceLink slug="conoha-wing">ConoHa WING</GuideServiceLink>
        </H3>
        <P>
          <GuideServiceLink slug="conoha-wing">ConoHa WING</GuideServiceLink>
          は表示速度に優れ、管理画面も使いやすい人気サーバーです。
        </P>
        <P>
          WordPressとの相性が非常によく、初心者でも数分でサイトを公開できます。
        </P>
        <H4>おすすめポイント</H4>
        <Ul>
          <li>高速表示</li>
          <li>WordPress簡単セットアップ</li>
          <li>初心者でも分かりやすい管理画面</li>
        </Ul>
        <GuideServiceCta item={conoha} location="guide_top10_conoha" />

        <Hr />

        <H3>
          3位{" "}
          <GuideServiceLink slug="shin-server">
            シンレンタルサーバー
          </GuideServiceLink>
        </H3>
        <P>
          最新技術を積極的に採用しており、高速性能とコストパフォーマンスを両立しています。
        </P>
        <P>高速環境でWordPressを運営したい方におすすめです。</P>
        <GuideServiceCta item={shin} location="guide_top10_shin" />

        <Hr />

        <H3>
          4位 <GuideServiceLink slug="mixhost">mixhost</GuideServiceLink>
        </H3>
        <P>LiteSpeed採用で高速表示が魅力。</P>
        <P>特にアフィリエイトブログ運営者から人気があります。</P>
        <GuideServiceCta item={mixhost} location="guide_top10_mixhost" />

        <Hr />

        <H3>
          5位{" "}
          <GuideServiceLink slug="colorfulbox">ColorfulBox</GuideServiceLink>
        </H3>
        <P>料金と機能のバランスが良く、初心者でも利用しやすいサーバーです。</P>
        <P>自動バックアップも無料で利用できます。</P>
        <GuideServiceCta
          item={colorfulbox}
          location="guide_top10_colorfulbox"
        />

        <Hr />

        <H3>
          6位{" "}
          <GuideServiceLink slug="sakura">さくらのレンタルサーバ</GuideServiceLink>
        </H3>
        <P>老舗レンタルサーバー。</P>
        <P>企業や教育機関でも利用実績があり、信頼性があります。</P>
        <GuideServiceCta item={sakura} location="guide_top10_sakura" />

        <Hr />

        <H3>
          7位 <GuideServiceLink slug="lolipop">ロリポップ！</GuideServiceLink>
        </H3>
        <P>低価格ながらWordPressにも対応。</P>
        <P>初心者が最初に契約するサーバーとして人気です。</P>
        <GuideServiceCta item={lolipop} location="guide_top10_lolipop" />

        <Hr />

        <H3>
          8位 <GuideServiceLink slug="kagoya">KAGOYA</GuideServiceLink>
        </H3>
        <P>法人利用を想定した高い安定性が魅力。</P>
        <P>サポート体制も充実しています。</P>
        <GuideServiceCta item={kagoya} location="guide_top10_kagoya" />

        <Hr />

        <H3>
          9位{" "}
          <GuideServiceLink slug="coreserver">CoreServer</GuideServiceLink>
        </H3>
        <P>コストパフォーマンスに優れたレンタルサーバー。</P>
        <P>複数サイト運営にも向いています。</P>
        <GuideServiceCta item={coreserver} location="guide_top10_coreserver" />

        <Hr />

        <H3>
          10位{" "}
          <GuideServiceLink slug="star-server">スターサーバー</GuideServiceLink>
        </H3>
        <P>価格を抑えながら高速なNVMeストレージを採用。</P>
        <P>個人サイトや小規模ブログにおすすめです。</P>
        <GuideServiceCta item={star} location="guide_top10_star" />
      </section>

      <Hr />

      <section>
        <H2 id="by-purpose">用途別おすすめレンタルサーバー</H2>

        <H3>初心者なら</H3>
        <Ul>
          <li>
            <GuideServiceLink slug="xserver">エックスサーバー</GuideServiceLink>
          </li>
          <li>
            <GuideServiceLink slug="conoha-wing">ConoHa WING</GuideServiceLink>
          </li>
          <li>
            <GuideServiceLink slug="lolipop">ロリポップ！</GuideServiceLink>
          </li>
        </Ul>

        <H3>ブログ運営なら</H3>
        <Ul>
          <li>
            <GuideServiceLink slug="xserver">エックスサーバー</GuideServiceLink>
          </li>
          <li>
            <GuideServiceLink slug="conoha-wing">ConoHa WING</GuideServiceLink>
          </li>
          <li>
            <GuideServiceLink slug="mixhost">mixhost</GuideServiceLink>
          </li>
        </Ul>

        <H3>WordPressなら</H3>
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

        <H3>法人サイトなら</H3>
        <Ul>
          <li>
            <GuideServiceLink slug="xserver">エックスサーバー</GuideServiceLink>
          </li>
          <li>
            {cpi ? (
              <GuideServiceLink slug="cpi">CPI</GuideServiceLink>
            ) : (
              "CPI"
            )}
          </li>
          <li>
            <GuideServiceLink slug="kagoya">KAGOYA</GuideServiceLink>
          </li>
        </Ul>

        <H3>コスパ重視なら</H3>
        <Ul>
          <li>
            <GuideServiceLink slug="shin-server">
              シンレンタルサーバー
            </GuideServiceLink>
          </li>
          <li>
            <GuideServiceLink slug="colorfulbox">ColorfulBox</GuideServiceLink>
          </li>
          <li>
            <GuideServiceLink slug="coreserver">CoreServer</GuideServiceLink>
          </li>
        </Ul>
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
          レンタルサーバーは、料金だけで選ぶのではなく、表示速度・安定性・サポート・WordPressとの相性などを総合的に比較することが重要です。
        </P>
        <P>
          迷った場合は、次の3社から選べば大きく失敗する可能性は低いでしょう。
        </P>
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
        <P>
          サーバー図鑑では、各サービスの詳細レビューや
          <GuidePageLink href={compareHref}>比較ページ</GuidePageLink>
          も掲載しています。ぜひ用途に合ったレンタルサーバーを見つけて、快適なサイト運営を始めてください。
        </P>
      </section>

      <p className="mt-6 text-[12px] text-[var(--text-muted)]">
        <Link
          href={`/${PRIMARY_CATEGORY_SLUG}`}
          className="hover:text-[var(--accent)]"
        >
          サーバー図鑑TOPへ戻る
        </Link>
      </p>
    </>
  );
}
