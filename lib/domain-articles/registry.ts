export type DomainBeginnerArticle = {
  slug: string;
  title: string;
  description: string;
  /** managed_contents.source_type と一致させる */
  sourceType: string;
  toc: Array<{ id: string; label: string }>;
  /** 管理画面未登録時のフォールバック HTML */
  defaultHtml: string;
};

function domainArticleSourceType(slug: string) {
  return `domain_article:${slug}`;
}

const CTA_LINKS = `
<nav class="domain-article-cta" aria-label="関連ページ">
  <p><strong>あわせて確認する</strong></p>
  <ul>
    <li><a href="/domain#recommended-ranking">ドメインランキングを見る</a></li>
    <li><a href="/domain#domain-compare-table">料金・サポートを比較表で確認する</a></li>
    <li><a href="/domain/services">サービス一覧を見る</a></li>
  </ul>
</nav>
`.trim();

export const DOMAIN_BEGINNER_ARTICLES: DomainBeginnerArticle[] = [
  {
    slug: "what-is-domain",
    title: "ドメインとは？",
    description:
      "ドメインとは何か、種類や役割、選び方まで初心者向けに分かりやすく解説します。",
    sourceType: domainArticleSourceType("what-is-domain"),
    toc: [
      { id: "role", label: "ドメインの役割" },
      { id: "types", label: "主なドメインの種類" },
      { id: "naming", label: "ドメイン名の選び方" },
      { id: "with-server", label: "レンタルサーバーとの関係" },
    ],
    defaultHtml: `
<section>
  <h2 id="role">ドメインの役割</h2>
  <p>ドメインとは、インターネット上の「住所」のようなものです。</p>
  <p>例えば「example.com」の「example.com」がドメインにあたります。ホームページやブログ、ネットショップなどを公開するには、基本的にドメインが必要です。</p>
</section>
<section>
  <h2 id="types">主なドメインの種類</h2>
  <p>ドメインにはさまざまな種類があり、代表的なものには「.com」「.jp」「.net」「.org」などがあります。</p>
  <ul>
    <li><strong>.com</strong>：世界中で最も利用されている定番ドメイン</li>
    <li><strong>.jp</strong>：日本国内向けサイトに人気</li>
    <li><strong>.net</strong>：IT・ネット関連サービスでよく利用される</li>
    <li><strong>.org</strong>：団体や非営利組織で利用されることが多い</li>
  </ul>
</section>
<section>
  <h2 id="naming">ドメイン名の選び方</h2>
  <p>一度取得したドメインは、そのサイトの住所として長く利用することになります。そのため、覚えやすく短い名前を選ぶことが大切です。</p>
</section>
<section>
  <h2 id="with-server">レンタルサーバーとの関係</h2>
  <p>また、多くのレンタルサーバーでは、ドメイン取得から設定までまとめて行えるため、初心者でも簡単にホームページを始められます。</p>
</section>
${CTA_LINKS}
`.trim(),
  },
  {
    slug: "how-to-register-domain",
    title: "ドメイン取得の流れ",
    description:
      "初めてドメインを取得する方向けに、申し込みからホームページ公開までの流れを解説します。",
    sourceType: domainArticleSourceType("how-to-register-domain"),
    toc: [
      { id: "choose-service", label: "ドメインサービスを選ぶ" },
      { id: "search-name", label: "ドメイン名を検索する" },
      { id: "connect-publish", label: "サーバー接続と公開" },
    ],
    defaultHtml: `
<section>
  <h2 id="choose-service">ドメインサービスを選ぶ</h2>
  <p>ドメイン取得は難しそうに見えますが、実際には10分ほどで申し込みが完了します。</p>
  <p>まずはドメインサービスを選びます。</p>
  <h3>比較するポイント</h3>
  <p>比較するポイントは次のとおりです。</p>
  <ul>
    <li>取得料金</li>
    <li>更新料金</li>
    <li>管理画面の使いやすさ</li>
    <li>サポート</li>
    <li>Whois代理公開</li>
  </ul>
</section>
<section>
  <h2 id="search-name">ドメイン名を検索する</h2>
  <p>次に取得したいドメイン名を検索します。</p>
  <p>希望する名前が空いていれば、そのまま申し込みできます。</p>
</section>
<section>
  <h2 id="connect-publish">サーバー接続と公開</h2>
  <p>その後はレンタルサーバーと接続し、WordPressなどをインストールすればホームページを公開できます。</p>
  <p>最近ではサーバーとドメインを同時に契約すると、自動で設定まで完了するサービスも増えています。</p>
</section>
${CTA_LINKS}
`.trim(),
  },
  {
    slug: "com-vs-jp",
    title: ".comと.jpの違い",
    description:
      ".comと.jpの違いや選び方を初心者向けに分かりやすく紹介します。",
    sourceType: domainArticleSourceType("com-vs-jp"),
    toc: [
      { id: "overview", label: ".comと.jpの特徴" },
      { id: "how-to-choose", label: "一般的な選び方" },
      { id: "tips", label: "選ぶときのポイント" },
    ],
    defaultHtml: `
<section>
  <h2 id="overview">.comと.jpの特徴</h2>
  <p>ドメインを取得するとき、多くの人が迷うのが「.com」と「.jp」です。</p>
  <p>.comは世界で最も利用されているドメインで、個人・法人を問わず人気があります。</p>
  <p>一方、.jpは日本国内向けサイトで多く利用され、国内企業や店舗サイトでもよく採用されています。</p>
</section>
<section>
  <h2 id="how-to-choose">一般的な選び方</h2>
  <p>一般的には次のような選び方が多く見られます。</p>
  <ul>
    <li>個人ブログなら.com</li>
    <li>企業サイトなら.jp</li>
  </ul>
  <p>ただし、絶対的なルールはありません。</p>
</section>
<section>
  <h2 id="tips">選ぶときのポイント</h2>
  <p>希望するドメイン名が空いていることや、更新料金も比較しながら選ぶのがおすすめです。</p>
</section>
${CTA_LINKS}
`.trim(),
  },
  {
    slug: "what-is-whois-privacy",
    title: "Whois代理公開とは？",
    description:
      "Whois代理公開とは何か、個人情報との関係や必要性について分かりやすく解説します。",
    sourceType: domainArticleSourceType("what-is-whois-privacy"),
    toc: [
      { id: "what-is-whois", label: "Whoisとは" },
      { id: "privacy", label: "Whois代理公開の役割" },
      { id: "check", label: "比較時の確認ポイント" },
    ],
    defaultHtml: `
<section>
  <h2 id="what-is-whois">Whoisとは</h2>
  <p>ドメインを取得すると、登録者情報はWhoisという仕組みに登録されます。</p>
  <p>そのままでは登録情報が公開対象になる場合があるため、多くのサービスではWhois代理公開が利用できます。</p>
</section>
<section>
  <h2 id="privacy">Whois代理公開の役割</h2>
  <p>Whois代理公開を利用すると、自分の情報ではなく、ドメイン会社の情報が表示されます。</p>
  <p>個人ブログや副業サイトを運営する方にとって、プライバシーを守る重要な機能です。</p>
</section>
<section>
  <h2 id="check">比較時の確認ポイント</h2>
  <p>現在では多くのドメイン会社で無料提供されていますが、一部対象外となるドメインもあります。</p>
  <p>ドメインを比較するときは、料金だけでなくWhois代理公開に対応しているかも確認すると安心です。</p>
</section>
${CTA_LINKS}
`.trim(),
  },
];

export function getDomainBeginnerArticle(
  slug: string,
): DomainBeginnerArticle | null {
  return DOMAIN_BEGINNER_ARTICLES.find((a) => a.slug === slug) ?? null;
}

export function listDomainBeginnerArticleSlugs(): string[] {
  return DOMAIN_BEGINNER_ARTICLES.map((a) => a.slug);
}

export { domainArticleSourceType };
