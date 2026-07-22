/**
 * Phase2「サービスの器」一括登録用カタログ。
 * DB の services 行の元データ。比較項目・プラン・料金は含めない。
 * Provider 対応は scraperProviderId / catalog.ts 側で管理する。
 */

export type Phase2ShellService = {
  name: string;
  slug: string;
  officialUrl: string;
  /** 100〜200文字程度の概要 */
  summary: string;
  displayOrder: number;
  /** lib/scraping/catalog の id。未対応なら null */
  scraperProviderId: string | null;
};

/** 既存2社 + 残り18社（合計20） */
export const PHASE2_SHELL_SERVICES: readonly Phase2ShellService[] = [
  {
    name: "エックスサーバー",
    slug: "xserver",
    officialUrl: "https://www.xserver.ne.jp/",
    summary:
      "高速SSDと充実したWordPress向け機能が特徴の国内シェア上位レンタルサーバー。スタンダード／プレミアム／ビジネスなど用途に応じたプランがあり、個人ブログから法人サイトまで幅広く利用されています。",
    displayOrder: 1,
    scraperProviderId: "xserver",
  },
  {
    name: "ConoHa WING",
    slug: "conoha-wing",
    officialUrl: "https://www.conoha.jp/",
    summary:
      "国内最速級を掲げるWordPress向けレンタルサーバー。WINGパックによる長期割引や独自ドメイン特典が特徴で、ベーシック／スタンダード／プレミアムなど直感的なプラン構成が個人・小規模サイト運用に向いています。",
    displayOrder: 2,
    scraperProviderId: "conoha-wing",
  },
  {
    name: "シンレンタルサーバー",
    slug: "shin-server",
    officialUrl: "https://www.shin-server.jp/",
    summary:
      "エックスサーバー系列の比較的新しいレンタルサーバーブランド。高速性とコストのバランスを重視した構成で、ブログや個人サイト、これから本格運用を始める方向けの選択肢として位置づけられています。",
    displayOrder: 3,
    scraperProviderId: "shin-server",
  },
  {
    name: "ロリポップ！",
    slug: "lolipop",
    officialUrl: "https://lolipop.jp/",
    summary:
      "初心者にも使いやすいことで知られる人気レンタルサーバー。直感的な管理画面と豊富なプランが特徴で、ハイスピードプランなど用途に応じた選択が可能。初めてのサーバー契約やブログ開設にも選ばれやすいサービスです。",
    displayOrder: 4,
    scraperProviderId: "lolipop",
  },
  {
    name: "mixhost",
    slug: "mixhost",
    officialUrl: "https://mixhost.jp/",
    summary:
      "LiteSpeedやHTTP/3対応など速度面を前面に出したレンタルサーバー。スタンダード系プランを中心に、ブログやメディアサイトなど表示速度を重視する運用に向いた構成が特徴です。コストと性能のバランスも評価されています。",
    displayOrder: 5,
    scraperProviderId: "mixhost",
  },
  {
    name: "さくらのレンタルサーバ",
    slug: "sakura",
    officialUrl: "https://rs.sakura.ad.jp/",
    summary:
      "さくらインターネットが提供する国内老舗のレンタルサーバー。ライトからスタンダード、ビジネスまで幅広いプランがあり、コーポレートサイトや長期運用を前提としたサイトに選ばれやすい安定感が特徴です。",
    displayOrder: 6,
    scraperProviderId: "sakura",
  },
  {
    name: "お名前.com レンタルサーバー",
    slug: "onamae",
    officialUrl: "https://www.onamae-server.com/",
    summary:
      "ドメイン大手のお名前.comが提供するレンタルサーバー。ドメイン取得とセットで検討されやすく、個人からビジネス用途までカバーします。初めてのサイト公開やドメインとまとめて契約したい場合に候補になりやすいサービスです。",
    displayOrder: 7,
    scraperProviderId: "onamae",
  },
  {
    name: "ColorfulBox",
    slug: "colorfulbox",
    officialUrl: "https://www.colorfulbox.jp/",
    summary:
      "NVMe SSDやLiteSpeedなど高速構成を打ち出すコスパ重視のレンタルサーバー。BOXシリーズのプラン構成で、ブログやアフィリエイトなどコストを抑えつつ表示速度も意識したい運用に向いています。",
    displayOrder: 8,
    scraperProviderId: "colorfulbox",
  },
  {
    name: "CoreServer",
    slug: "coreserver",
    officialUrl: "https://www.coreserver.jp/",
    summary:
      "バリュードメイン系列の高機能レンタルサーバー。V1／V2など世代やスペックに応じたプランがあり、開発者向け用途や複数サイト運用にも使われやすい構成です。ドメインサービスとの連携も特徴のひとつです。",
    displayOrder: 9,
    scraperProviderId: "coreserver",
  },
  {
    name: "KAGOYA",
    slug: "kagoya",
    officialUrl: "https://www.kagoya.jp/",
    summary:
      "カゴヤ・ジャパンが提供する国内データセンター運用のホスティング。レンタルサーバーからクラウドまで幅広いラインがあり、法人サイトや安定運用を重視するケースで検討されやすい選択肢です。",
    displayOrder: 10,
    scraperProviderId: "kagoya",
  },
  {
    name: "ラッコサーバー",
    slug: "rakko-server",
    officialUrl: "https://rakkoserver.com/",
    summary:
      "ラッコM&Aなどで知られるラッコシリーズのレンタルサーバー。サイト売買やアフィリエイト用途との親和性を意識したサービスで、個人・事業者のWeb運用基盤としてシンプルに使える構成が特徴です。",
    displayOrder: 11,
    scraperProviderId: "rakko-server",
  },
  {
    name: "heteml",
    slug: "heteml",
    officialUrl: "https://heteml.jp/",
    summary:
      "GMOペパボ系列のレンタルサーバー。デザイナーや制作者にも支持され、制作会社やポートフォリオ、複数サイト運用にも使われやすい構成です。クリエイティブ用途との相性を意識したサービスとして知られています。",
    displayOrder: 12,
    scraperProviderId: "heteml",
  },
  {
    name: "CPI",
    slug: "cpi",
    officialUrl: "https://www.cpi.ad.jp/",
    summary:
      "ビジネス向けの安定運用を訴求するレンタルサーバー。シェアードプランなどのラインナップがあり、コーポレートサイトや業務用途のWebサイトなど、法人・ビジネスシーンで検討されやすいサービスです。",
    displayOrder: 13,
    scraperProviderId: "cpi",
  },
  {
    name: "WebARENA Indigo",
    slug: "webarena-indigo",
    officialUrl: "https://web.arena.ne.jp/indigo/",
    summary:
      "NTTPCコミュニケーションズのWebARENAシリーズに属するホスティング。Indigoはクラウド寄りの柔軟な構成が特徴で、開発・検証から本番運用まで幅広く使える選択肢として位置づけられています。",
    displayOrder: 14,
    scraperProviderId: "webarena-indigo",
  },
  {
    name: "XREA",
    slug: "xrea",
    officialUrl: "https://www.xrea.com/",
    summary:
      "長年の実績があるレンタルサーバー・ホスティングブランド。コストを抑えた運用や複数サイトのホスティングに使われやすく、個人から小規模ビジネスまで幅広い層に選ばれてきたサービスです。",
    displayOrder: 15,
    scraperProviderId: "xrea",
  },
  {
    name: "スターサーバー",
    slug: "star-server",
    officialUrl: "https://www.star.ne.jp/",
    summary:
      "ネットオウル系列のレンタルサーバー。ドメインサービスとの連携も特徴で、個人サイトや小規模ビジネスサイトの公開基盤として利用されています。初めてのサーバー契約候補としても挙がりやすいサービスです。",
    displayOrder: 16,
    scraperProviderId: "star-server",
  },
  {
    name: "ABLENET",
    slug: "ablenet",
    officialUrl: "https://www.ablenet.jp/",
    summary:
      "国内レンタルサーバー・ホスティングを提供するサービス。用途に応じたプラン選択ができ、個人サイトからビジネス用途まで幅広くカバーします。安定運用とコストのバランスを見ながら検討しやすい選択肢です。",
    displayOrder: 17,
    scraperProviderId: "ablenet",
  },
  {
    name: "iCLUSTA+",
    slug: "iclusta",
    officialUrl: "https://shared.gmocloud.com/",
    summary:
      "共有サーバーブランドとして知られるiCLUSTA+。ビジネス用途や複数サイト運用にも対応しやすい構成が特徴で、安定性や運用面を重視するケースで候補になりやすいレンタルサーバーです。",
    displayOrder: 18,
    scraperProviderId: "iclusta",
  },
  {
    name: "Zenlogic",
    slug: "zenlogic",
    officialUrl: "https://www.idcf.jp/rentalserver/",
    summary:
      "IDCフロンティアが提供するホスティングサービス。法人・ビジネス用途を意識した構成が特徴で、コーポレートサイトや安定運用が求められるWeb基盤として検討されやすい選択肢です。",
    displayOrder: 19,
    scraperProviderId: "zenlogic",
  },
  {
    name: "FUTOKA",
    slug: "futoka",
    officialUrl: "https://www.futoka.jp/",
    summary:
      "国内レンタルサーバーとして個人・事業者向けに提供されるサービス。用途に合わせたプラン選択ができ、サイト公開の基盤としてシンプルに使える点が特徴です。コストを意識した運用にも候補になりやすいサービスです。",
    displayOrder: 20,
    scraperProviderId: "futoka",
  },
] as const;

/** 新規登録対象（Provider対応済みの既存2社を除く18社） */
export const PHASE2_SHELL_SERVICES_TO_INSERT = PHASE2_SHELL_SERVICES.filter(
  (s) => s.slug !== "xserver" && s.slug !== "conoha-wing",
);
