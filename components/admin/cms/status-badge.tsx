export type CmsBadgeStatus =
  | "draft"
  | "pending_review"
  | "published"
  | "unpublished"
  | "expired"
  | "changed"
  | "unsaved";

const LABELS: Record<CmsBadgeStatus, string> = {
  draft: "ドラフト",
  pending_review: "確認待ち",
  published: "公開中",
  unpublished: "非公開",
  expired: "期限切れ",
  changed: "変更あり",
  unsaved: "未保存",
};

const STYLES: Record<CmsBadgeStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  pending_review: "bg-amber-100 text-amber-800",
  published: "bg-emerald-100 text-emerald-800",
  unpublished: "bg-slate-100 text-slate-500",
  expired: "bg-red-100 text-red-800",
  changed: "bg-blue-100 text-blue-800",
  unsaved: "bg-orange-100 text-orange-800",
};

type Props = {
  status: CmsBadgeStatus;
  className?: string;
};

/** CMSの公開状態バッジ（draft/pending_review/published/unpublished/expired/changed/unsaved）。 */
export function StatusBadge({ status, className = "" }: Props) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${STYLES[status]} ${className}`}
    >
      {LABELS[status]}
    </span>
  );
}
