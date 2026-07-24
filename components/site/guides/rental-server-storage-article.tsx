import Image from "next/image";
import Link from "next/link";
import type { GuideArticleProps } from "@/lib/guides/types";
import { PRIMARY_CATEGORY_SLUG } from "@/lib/site/brand";
import { categoryPath } from "@/lib/links";
import { GuidePageLink } from "@/components/site/guides/guide-links";
import { FaqAccordion } from "@/components/site/faq-accordion";
import type { FaqItem } from "@/lib/site/content";
import { buttonClass, cn } from "@/components/site/ui";

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "容量が大きいほど良いですか？",
    answer:
      "容量が大きいことにはメリットがありますが、必要以上に大きな容量が必要とは限りません。用途や将来の運営計画に合わせて選ぶことが大切です。",
  },
  {
    question: "ブログなら1TB必要ですか？",
    answer:
      "ブログの内容や運営期間によって異なります。画像を多く掲載する場合や、長期間運営する予定がある場合は、将来の容量も考慮して選ぶと安心です。",
  },
  {
    question: "容量がいっぱいになるとどうなりますか？",
    answer:
      "サービスによって異なりますが、新しいデータを保存できなくなるなど、運営に影響が出る場合があります。空き容量を定期的に確認し、必要に応じてプラン変更を検討しましょう。",
  },
];

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

export function RentalServerStorageArticle(_props: GuideArticleProps) {
  const compareHref = categoryPath(PRIMARY_CATEGORY_SLUG, "compare");
  const topHref = `/${PRIMARY_CATEGORY_SLUG}`;

  return (
    <>
      <section>
        <H2 id="intro">レンタルサーバーの容量は何GBあれば十分？</H2>
        <P>
          レンタルサーバーを比較していると、「300GB」「500GB」「1TB」など、さまざまな容量のプランがあります。
        </P>
        <P>「容量が大きい方が良いの？」</P>
        <P>「ブログなら何GBあれば十分？」</P>
        <P>このような疑問を持つ方も多いでしょう。</P>
        <P>
          実際には、必要な容量はサイトの用途や運営方法によって異なります。
        </P>
        <P>
          この記事では、レンタルサーバーの容量の考え方や、用途別の目安を紹介します。
        </P>
        <GuideFigure
          src="/images/guides/selection-flow.jpg"
          alt="レンタルサーバーの容量を用途に合わせて選ぶイメージ"
          priority
        />
      </section>

      <Hr />

      <section>
        <H2 id="what-is-storage">容量とは？</H2>
        <P>
          レンタルサーバーの容量とは、ホームページやブログのデータを保存できる保存領域のことです。
        </P>
        <P>例えば、次のようなデータが容量を使用します。</P>
        <Ul>
          <li>HTML・CSS・JavaScript</li>
          <li>WordPress本体</li>
          <li>プラグイン</li>
          <li>テーマ</li>
          <li>画像</li>
          <li>動画（サーバーへ保存する場合）</li>
          <li>データベース</li>
        </Ul>
        <P>
          特に画像を多く掲載するサイトでは、容量の消費が大きくなる傾向があります。
        </P>
      </section>

      <Hr />

      <section>
        <H2 id="by-purpose">用途別の容量の目安</H2>

        <H3>ブログ</H3>
        <P>
          一般的なブログでは、画像を適切なサイズにして運営する場合、比較的大容量のプランでなくても十分運営できることがあります。
        </P>
        <P>
          長期運営や記事数の増加を考える場合は、将来的な余裕も考慮すると安心です。
        </P>

        <H3>コーポレートサイト</H3>
        <P>
          会社概要やサービス紹介などを中心とした企業サイトでは、容量を大量に使用しないケースもあります。
        </P>
        <P>
          一方で、資料や画像を多く掲載する場合は、それに応じた容量を検討しましょう。
        </P>

        <H3>ECサイト</H3>
        <P>
          商品画像や商品ページが増えるため、他の用途より容量を多く使用する場合があります。
        </P>
        <P>
          取扱商品数や運営方法に合わせてプランを選ぶことが大切です。
        </P>

        <H3>複数サイトを運営する場合</H3>
        <P>
          1つのレンタルサーバーで複数のサイトを運営する場合は、それぞれのサイトで容量を使用します。
        </P>
        <P>
          サイト数が増える予定がある場合は、容量に余裕のあるプランも選択肢になります。
        </P>
      </section>

      <Hr />

      <section>
        <H2 id="not-only-storage">容量だけで選んでも大丈夫？</H2>
        <P>
          容量は重要な比較ポイントですが、それだけで判断するのはおすすめできません。
        </P>
        <P>例えば、</P>
        <Ul>
          <li>表示速度</li>
          <li>サポート体制</li>
          <li>バックアップ</li>
          <li>WordPress対応</li>
          <li>月額料金</li>
        </Ul>
        <P>
          などもあわせて比較すると、自分に合ったサービスを選びやすくなります。
        </P>
      </section>

      <Hr />

      <section>
        <H2 id="when-full">容量が足りなくなったら？</H2>
        <P>サービスによっては、上位プランへの変更に対応しています。</P>
        <P>
          対応方法や条件はレンタルサーバーごとに異なるため、契約前に確認しておくと安心です。
        </P>
      </section>

      <Hr />

      <section>
        <H2 id="save-storage">容量を節約する方法</H2>
        <P>容量を効率よく使うためには、次のような方法があります。</P>
        <Ul>
          <li>画像サイズを最適化する</li>
          <li>使用していない画像を削除する</li>
          <li>不要なテーマやプラグインを整理する</li>
          <li>動画は動画配信サービスを利用することも検討する</li>
        </Ul>
        <P>
          日頃からデータを整理することで、容量を有効に活用しやすくなります。
        </P>
      </section>

      <Hr />

      <section>
        <H2 id="compare">サーバー図鑑で容量を比較する</H2>
        <P>レンタルサーバーによって、提供されている容量は異なります。</P>
        <P>サーバー図鑑では、</P>
        <Ul>
          <li>容量</li>
          <li>月額料金</li>
          <li>WordPress対応</li>
          <li>ストレージの種類</li>
          <li>サポート体制</li>
        </Ul>
        <P>などを比較できます。</P>
        <P>
          用途に合わせて比較しながら、自分に合ったレンタルサーバーを選んでみてください。
        </P>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={compareHref}
            className={cn(buttonClass("primary", "sm"), "inline-flex")}
          >
            レンタルサーバーを比較する
          </Link>
          <Link
            href={topHref}
            className={cn(buttonClass("secondary", "sm"), "inline-flex")}
          >
            おすすめランキングを見る
          </Link>
        </div>
        <P>
          あわせて、
          <GuidePageLink href="/guides/rental-server-recommendation">
            レンタルサーバーおすすめ10選
          </GuidePageLink>
          や
          <GuidePageLink href="/guides/cheap-rental-server">
            月額料金が安いレンタルサーバー
          </GuidePageLink>
          も参考にしてください。
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
          レンタルサーバーの容量は、ブログ・企業サイト・ECサイトなど用途によって必要な目安が異なります。
        </P>
        <P>
          容量だけで判断するのではなく、表示速度や料金、サポート体制なども含めて比較することが大切です。
        </P>
        <P>
          サーバー図鑑では、容量を含めた比較やランキングを掲載しています。気になるサービスがあれば、
          <GuidePageLink href={compareHref}>比較ページ</GuidePageLink>
          や詳細レビューもぜひ参考にしてください。
        </P>
      </section>
    </>
  );
}
