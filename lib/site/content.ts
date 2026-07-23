/** クイック診断・目的別セクション用の定義（将来の診断ロジック拡張の器） */
export type PurposeOption = {
  id: string;
  label: string;
  /** サービス一覧の ?purpose= やセクション id に使う */
  sectionId: string;
  /** recommended_uses / catchphrase / about_text に対するキーワード（部分一致） */
  keywords: string[];
  description: string;
};

export const PURPOSE_OPTIONS: PurposeOption[] = [
  {
    id: "beginner",
    label: "初心者向け",
    sectionId: "purpose-beginner",
    keywords: ["初心者", "初めて", "かんたん", "簡単", "入門"],
    description: "初めてでも迷いにくいサーバー",
  },
  {
    id: "blog",
    label: "ブログ向け",
    sectionId: "purpose-blog",
    keywords: ["ブログ", "blog", "アフィリエイト"],
    description: "ブログ運営に向いたサーバー",
  },
  {
    id: "business",
    label: "法人向け",
    sectionId: "purpose-business",
    keywords: ["法人", "ビジネス", "企業", "会社"],
    description: "法人・ビジネス利用向け",
  },
  {
    id: "speed",
    label: "表示速度が速い",
    sectionId: "purpose-speed",
    keywords: ["速度", "速い", "高速", "パフォーマンス"],
    description: "表示速度を重視する方向け",
  },
  {
    id: "cheap",
    label: "月額料金が安い",
    sectionId: "purpose-cheap",
    keywords: ["安い", "料金", "節約", "お得", "低価格"],
    description: "月額を抑えたい方向け",
  },
  {
    id: "costperf",
    label: "コスパ",
    sectionId: "purpose-costperf",
    keywords: ["コスパ", "コストパフォーマンス", "バランス"],
    description: "料金と機能のバランスが良いサーバー",
  },
  {
    id: "wordpress",
    label: "WordPress向け",
    sectionId: "purpose-wordpress",
    keywords: ["WordPress", "ワードプレス", "WP"],
    description: "WordPress運用に向いたサーバー",
  },
  {
    id: "multi",
    label: "複数サイト運営",
    sectionId: "purpose-multi",
    keywords: ["複数", "マルチ", "サイト数", "たくさん"],
    description: "複数サイトをまとめて運用したい方向け",
  },
  {
    id: "support",
    label: "サポート重視",
    sectionId: "purpose-support",
    keywords: ["サポート", "電話", "チャット", "相談"],
    description: "困ったときに相談しやすいサーバー",
  },
  {
    id: "storage",
    label: "大容量",
    sectionId: "purpose-storage",
    keywords: ["大容量", "容量", "ストレージ", "GB", "TB"],
    description: "容量に余裕が欲しい方向け",
  },
];

/** ランキング管理用カテゴリ（総合を先頭、初心者→法人→その他） */
export const RANKING_PURPOSE_OPTIONS: PurposeOption[] = (() => {
  const overall: PurposeOption = {
    id: "overall",
    label: "総合ランキング",
    sectionId: "purpose-overall",
    keywords: ["総合", "おすすめ"],
    description: "編集部の総合おすすめ",
  };
  const byId = new Map(PURPOSE_OPTIONS.map((o) => [o.id, o]));
  const preferred = ["beginner", "business"] as const;
  const rest = PURPOSE_OPTIONS.filter(
    (o) => o.id !== "beginner" && o.id !== "business",
  );
  return [
    overall,
    ...preferred.map((id) => byId.get(id)!),
    ...rest,
  ];
})();

/** TOP「おすすめランキング」の初期3タブ（管理画面カテゴリと連動） */
export const TOP_RANKING_TABS = [
  { purposeId: "overall", label: "総合おすすめ" },
  { purposeId: "beginner", label: "初心者おすすめ" },
  { purposeId: "business", label: "法人向けおすすめ" },
] as const;

export const PURPOSE_SECTIONS = [
  {
    id: "purpose-wordpress",
    title: "初めてWordPressを始める人",
    purposeId: "wordpress",
  },
  {
    id: "purpose-cheap",
    title: "料金を抑えたい人",
    purposeId: "cheap",
  },
  {
    id: "purpose-speed",
    title: "表示速度を重視する人",
    purposeId: "speed",
  },
  {
    id: "purpose-multi",
    title: "複数サイトを運営する人",
    purposeId: "multi",
  },
  {
    id: "purpose-business",
    title: "法人・ビジネスで使う人",
    purposeId: "business",
  },
] as const;

export const SELECTION_GUIDES = [
  {
    number: 1,
    title: "月額料金だけで決めない",
    summary: "初期費用・更新時の料金・キャンペーン条件も確認しましょう。",
    detail: "安さだけでなく、契約期間や特典の条件をセットで見ると失敗しにくいです。",
  },
  {
    number: 2,
    title: "WordPressの始めやすさを確認する",
    summary: "ワンクリックインストールや専用機能の有無をチェック。",
    detail: "初めてでも迷わず始められるかが、継続のしやすさにつながります。",
  },
  {
    number: 3,
    title: "表示速度と安定性を見る",
    summary: "アクセスが増えても快適に表示できるかを確認します。",
    detail: "速度は体感満足度に直結するため、比較表でも注目しておきましょう。",
  },
  {
    number: 4,
    title: "バックアップの条件を確認する",
    summary: "自動バックアップの有無と、復元のしやすさを見ます。",
    detail: "トラブル時に戻せるかどうかは、安心感に大きく影響します。",
  },
  {
    number: 5,
    title: "困った時のサポートを確認する",
    summary: "対応時間・連絡手段・有人対応の有無を確認しましょう。",
    detail: "初心者ほど、問い合わせしやすいサポート体制が重要です。",
  },
] as const;

export type FaqItem = {
  question: string;
  answer: string;
};

export const SERVER_FAQS: FaqItem[] = [
  {
    question: "初心者にはどのレンタルサーバーがおすすめですか？",
    answer:
      "操作画面が分かりやすく、WordPressの導入が簡単なサービスを選ぶと安心です。当サイトのおすすめや目的別セクションから、初心者向けの特徴があるサービスを比較してみてください。",
  },
  {
    question: "月額料金以外に費用はかかりますか？",
    answer:
      "初期費用やドメイン取得費、オプション料金が発生する場合があります。比較表では月額だけでなく初期費用も確認できるようにしています。契約前に公式サイトの料金表もあわせてご確認ください。",
  },
  {
    question: "無料サーバーとの違いは何ですか？",
    answer:
      "有料のレンタルサーバーは表示速度・容量・サポート・独自ドメインの扱いなどで安定しやすい傾向があります。商用利用や本格的なサイト運営では有料サーバーが適している場合が多いです。",
  },
  {
    question: "WordPressは簡単に始められますか？",
    answer:
      "多くのレンタルサーバーでは、ワンクリックでWordPressを導入できる機能があります。サービス詳細ページや比較項目で、WordPress関連の機能を確認できます。",
  },
  {
    question: "あとから別のサーバーへ移行できますか？",
    answer:
      "多くの場合は移行可能です。ただし移行作業の手間やDNS切替、メール設定の変更が必要になることがあります。最初から用途に合うサーバーを選ぶと、後からの手間を減らせます。",
  },
  {
    question: "法人利用で確認すべき点は何ですか？",
    answer:
      "請求書対応、サポート窓口、稼働率やバックアップ体制、セキュリティ関連の機能などを確認すると安心です。目的別の「法人・ビジネス」から候補を絞り、比較表で条件を並べてみてください。",
  },
  {
    question: "比較ページでは何を確認できますか？",
    answer:
      "掲載中のサービスを好きなだけ選んで、料金・容量・バックアップ・サポートなどを同じ画面で並べて確認できます。気になる候補を比較に追加してから、比較ページへ進んでみてください。",
  },
];

/** 比較表の絞り込みチップ（表示フィルタ用・仮評価は生成しない） */
export const COMPARISON_FILTERS = [
  { id: "all", label: "すべて" },
  { id: "beginner", label: "初心者向け", purposeId: "beginner" },
  { id: "cheap", label: "安さ重視", purposeId: "cheap" },
  { id: "speed", label: "速度重視", purposeId: "speed" },
  { id: "business", label: "法人向け", purposeId: "business" },
] as const;

/** 目的別おすすめ直後：契約前の確認ガイド */
export const FAILURE_CHECK_POINTS = [
  {
    id: "price",
    title: "料金・契約条件",
    description:
      "月額料金だけでなく、契約期間・初期費用・更新料金・キャンペーン条件を確認",
    href: "#compare-categories",
    icon: "wallet" as const,
  },
  {
    id: "performance",
    title: "容量・性能",
    description:
      "容量、表示速度、転送量、安定性など、用途に必要な性能を確認",
    href: "#compare-categories",
    icon: "gauge" as const,
  },
  {
    id: "features",
    title: "機能・バックアップ",
    description:
      "無料SSL、WordPress対応、自動バックアップ、復元条件を確認",
    href: "#compare-categories",
    icon: "shield" as const,
  },
  {
    id: "support",
    title: "サポート",
    description:
      "電話・メール・チャットの有無、受付時間、法人対応を確認",
    href: "#compare-categories",
    icon: "headphones" as const,
  },
] as const;

/** おすすめ比較カテゴリ → 重視したい条件から探す（ランキングを開く） */
export const COMPARE_CATEGORY_LINKS = [
  { label: "初心者", href: "#purpose-beginner", purposeId: "beginner" },
  { label: "ブログ", href: "#purpose-blog", purposeId: "blog" },
  { label: "法人", href: "#purpose-business", purposeId: "business" },
  { label: "高速", href: "#purpose-speed", purposeId: "speed" },
  { label: "コスパ", href: "#purpose-costperf", purposeId: "costperf" },
] as const;

/** 目的別ランキング見出し（RANKING_PURPOSE_OPTIONS と同期） */
export const PURPOSE_RANKING_TITLES: Record<string, string> = Object.fromEntries(
  RANKING_PURPOSE_OPTIONS.map((o) => [
    o.id,
    o.id === "overall" ? o.label : `${o.label}ランキング`,
  ]),
);

/** TOPページ内ナビ（セクション順に合わせる） */
export const PAGE_SECTION_NAV = [
  { href: "#recommended-ranking", label: "おすすめランキング" },
  { href: "#compare-categories", label: "おすすめ比較" },
  { href: "#purpose-picker", label: "条件から探す" },
  { href: "#latest-contents", label: "最新情報" },
  { href: "#guide", label: "選び方" },
  { href: "#all-services", label: "掲載サービス" },
  { href: "#faq", label: "FAQ" },
] as const;

/** 契約前に押さえたい注意点（編集部が整理した一般的な確認事項） */
export const CONTRACT_CAUTIONS = [
  "キャンペーン料金と通常料金が異なる場合がある",
  "安さだけで選ぶと必要な機能が不足する場合がある",
  "長期契約が最安条件になっている場合がある",
  "バックアップの復元が有料の場合がある",
  "サポート方法や受付時間が異なる",
] as const;

/** 目的別：確認項目と注意点（静的ガイド。おすすめ判定はしない） */
export const PURPOSE_GUIDE_META: Record<
  string,
  { checkItems: string; caution: string }
> = {
  wordpress: {
    checkItems: "簡単インストール、無料SSL、バックアップ、サポート",
    caution: "初年度料金だけでなく更新料金も確認",
  },
  cheap: {
    checkItems: "月額、初期費用、契約期間、キャンペーン条件",
    caution: "最安表示が長期契約前提になっていないか確認",
  },
  speed: {
    checkItems: "表示速度、転送量、サーバースペック",
    caution: "計測条件やプラン差を公式情報で確認",
  },
  multi: {
    checkItems: "サイト数上限、容量、独自ドメイン数",
    caution: "複数サイト時の料金体系を確認",
  },
  business: {
    checkItems: "請求書対応、法人サポート、セキュリティ",
    caution: "法人契約の条件・サポート窓口を確認",
  },
  beginner: {
    checkItems: "簡単さ、WordPress、サポート、バックアップ",
    caution: "操作画面の分かりやすさとサポート手段を確認",
  },
  support: {
    checkItems: "電話・チャット・メール、受付時間",
    caution: "有人対応の有無と時間帯を確認",
  },
  storage: {
    checkItems: "容量、転送量、追加料金の有無",
    caution: "実効容量とオプション料金を確認",
  },
};

export const HERO_VALUE_PROPS = [
  "20サービスの特徴を整理",
  "料金・容量・機能を同じ基準で比較",
  "契約前に注意点を確認",
] as const;
