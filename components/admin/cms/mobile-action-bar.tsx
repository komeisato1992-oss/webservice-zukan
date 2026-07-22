"use client";

type Props = {
  onSaveDraft: () => void;
  onDiff: () => void;
  onPublish: () => void;
  saving?: boolean;
  dirtyCount?: number;
  unpublishedCount?: number;
  disabled?: boolean;
};

/**
 * 画面下部固定のアクションバー。下書き保存／差分確認／公開へ反映の3操作を並べる。
 * safe-area-inset-bottom を考慮したパディングでホームインジケーター付き端末に対応。
 */
export function MobileActionBar({
  onSaveDraft,
  onDiff,
  onPublish,
  saving = false,
  dirtyCount = 0,
  unpublishedCount = 0,
  disabled = false,
}: Props) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-3 pt-2 backdrop-blur [padding-bottom:calc(0.5rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-6xl items-stretch gap-2">
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={disabled || saving}
          className="relative flex h-12 flex-1 items-center justify-center rounded-lg border border-blue-300 bg-blue-50 px-2 text-sm font-medium text-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "保存中…" : "下書き保存"}
          {dirtyCount > 0 ? (
            <span className="absolute -top-1.5 -right-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-semibold text-white">
              {dirtyCount}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          onClick={onDiff}
          disabled={disabled}
          className="flex h-12 flex-1 items-center justify-center rounded-lg border border-slate-300 bg-white px-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          差分確認
        </button>
        <button
          type="button"
          onClick={onPublish}
          disabled={disabled || saving}
          className="relative flex h-12 flex-1 items-center justify-center rounded-lg bg-emerald-600 px-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          公開へ反映
          {unpublishedCount > 0 ? (
            <span className="absolute -top-1.5 -right-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-600 ring-inset">
              {unpublishedCount}
            </span>
          ) : null}
        </button>
      </div>
    </div>
  );
}
