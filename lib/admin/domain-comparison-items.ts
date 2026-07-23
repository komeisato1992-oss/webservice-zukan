/**
 * ドメイン図鑑・比較項目の定義（管理画面＋初期シード）。
 * group_key / item_key は DB と一致させる。
 */

export type DomainComparisonGroupKey = "price" | "feature" | "support";

export type DomainComparisonItemDef = {
  group_key: DomainComparisonGroupKey;
  item_key: string;
  /** 初期表示名 */
  display_name: string;
  /** 料金グループ内の TLD 見出し（price のみ） */
  tld_label?: string;
  /** 種別ラベル（UI表示用） */
  kind_label: string;
  is_visible: boolean;
  sort_order: number;
  /** 料金のみ。機能・サポートは常に false */
  highlight_best: boolean;
};

export const DOMAIN_COMPARISON_GROUP_LABELS: Record<
  DomainComparisonGroupKey,
  string
> = {
  price: "料金",
  feature: "機能",
  support: "サポート",
};

/** グループ表示順（固定） */
export const DOMAIN_COMPARISON_GROUP_ORDER: DomainComparisonGroupKey[] = [
  "price",
  "feature",
  "support",
];

export const DOMAIN_COMPARISON_ITEM_DEFS: readonly DomainComparisonItemDef[] = [
  // ---- 料金 (.com) ----
  {
    group_key: "price",
    item_key: "com_registration",
    display_name: "取得料金",
    tld_label: ".com",
    kind_label: "取得",
    is_visible: true,
    sort_order: 1,
    highlight_best: false,
  },
  {
    group_key: "price",
    item_key: "com_renewal",
    display_name: "更新料金",
    tld_label: ".com",
    kind_label: "更新",
    is_visible: true,
    sort_order: 2,
    highlight_best: false,
  },
  {
    group_key: "price",
    item_key: "com_transfer",
    display_name: "移管料金",
    tld_label: ".com",
    kind_label: "移管",
    is_visible: true,
    sort_order: 3,
    highlight_best: false,
  },
  // ---- 料金 (.jp) ----
  {
    group_key: "price",
    item_key: "jp_registration",
    display_name: "取得料金",
    tld_label: ".jp",
    kind_label: "取得",
    is_visible: true,
    sort_order: 4,
    highlight_best: false,
  },
  {
    group_key: "price",
    item_key: "jp_renewal",
    display_name: "更新料金",
    tld_label: ".jp",
    kind_label: "更新",
    is_visible: true,
    sort_order: 5,
    highlight_best: false,
  },
  {
    group_key: "price",
    item_key: "jp_transfer",
    display_name: "移管料金",
    tld_label: ".jp",
    kind_label: "移管",
    is_visible: true,
    sort_order: 6,
    highlight_best: false,
  },
  // ---- 料金 (.co.jp) ----
  {
    group_key: "price",
    item_key: "co_jp_registration",
    display_name: "取得料金",
    tld_label: ".co.jp",
    kind_label: "取得",
    is_visible: true,
    sort_order: 7,
    highlight_best: false,
  },
  {
    group_key: "price",
    item_key: "co_jp_renewal",
    display_name: "更新料金",
    tld_label: ".co.jp",
    kind_label: "更新",
    is_visible: true,
    sort_order: 8,
    highlight_best: false,
  },
  {
    group_key: "price",
    item_key: "co_jp_transfer",
    display_name: "移管料金",
    tld_label: ".co.jp",
    kind_label: "移管",
    is_visible: true,
    sort_order: 9,
    highlight_best: false,
  },
  // ---- 料金 (.net) ----
  {
    group_key: "price",
    item_key: "net_registration",
    display_name: "取得料金",
    tld_label: ".net",
    kind_label: "取得",
    is_visible: true,
    sort_order: 10,
    highlight_best: false,
  },
  {
    group_key: "price",
    item_key: "net_renewal",
    display_name: "更新料金",
    tld_label: ".net",
    kind_label: "更新",
    is_visible: true,
    sort_order: 11,
    highlight_best: false,
  },
  {
    group_key: "price",
    item_key: "net_transfer",
    display_name: "移管料金",
    tld_label: ".net",
    kind_label: "移管",
    is_visible: true,
    sort_order: 12,
    highlight_best: false,
  },
  // ---- 機能 ----
  {
    group_key: "feature",
    item_key: "whois_privacy",
    display_name: "Whois代理公開",
    kind_label: "機能",
    is_visible: true,
    sort_order: 1,
    highlight_best: false,
  },
  {
    group_key: "feature",
    item_key: "dns",
    display_name: "DNS設定",
    kind_label: "機能",
    is_visible: true,
    sort_order: 2,
    highlight_best: false,
  },
  {
    group_key: "feature",
    item_key: "dnssec",
    display_name: "DNSSEC",
    kind_label: "機能",
    is_visible: true,
    sort_order: 3,
    highlight_best: false,
  },
  {
    group_key: "feature",
    item_key: "auto_renewal",
    display_name: "自動更新",
    kind_label: "機能",
    is_visible: true,
    sort_order: 4,
    highlight_best: false,
  },
  {
    group_key: "feature",
    item_key: "domain_transfer",
    display_name: "ドメイン移管",
    kind_label: "機能",
    is_visible: true,
    sort_order: 5,
    highlight_best: false,
  },
  {
    group_key: "feature",
    item_key: "japanese_domain",
    display_name: "日本語ドメイン",
    kind_label: "機能",
    is_visible: false,
    sort_order: 6,
    highlight_best: false,
  },
  // ---- サポート ----
  {
    group_key: "support",
    item_key: "phone_support",
    display_name: "電話サポート",
    kind_label: "サポート",
    is_visible: true,
    sort_order: 1,
    highlight_best: false,
  },
  {
    group_key: "support",
    item_key: "email_support",
    display_name: "メールサポート",
    kind_label: "サポート",
    is_visible: true,
    sort_order: 2,
    highlight_best: false,
  },
  {
    group_key: "support",
    item_key: "chat_support",
    display_name: "チャットサポート",
    kind_label: "サポート",
    is_visible: true,
    sort_order: 3,
    highlight_best: false,
  },
  {
    group_key: "support",
    item_key: "free_domain_benefit",
    display_name: "無料ドメイン特典",
    kind_label: "サポート",
    is_visible: true,
    sort_order: 4,
    highlight_best: false,
  },
  {
    group_key: "support",
    item_key: "server_bundle_benefit",
    display_name: "サーバー同時契約特典",
    kind_label: "サポート",
    is_visible: true,
    sort_order: 5,
    highlight_best: false,
  },
];
