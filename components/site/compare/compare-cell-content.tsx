import { memo } from "react";
import type { CompareCell } from "@/lib/site/compare-rows";
import { cn } from "@/components/site/ui";

type Props = {
  cell: CompareCell;
  /** 行自体がおすすめ強調（is_highlighted） */
  fieldHighlighted?: boolean;
  compact?: boolean;
  active?: boolean;
};

/**
 * 比較セル共通表示。
 * - isBest → ⭐ + 青太字
 * - emphasize / plainBold → 青太字
 * - fieldHighlighted → 青太字
 */
export const CompareCellContent = memo(function CompareCellContent({
  cell,
  fieldHighlighted = false,
  compact = false,
  active = false,
}: Props) {
  const emphasize =
    cell.isBest ||
    cell.emphasize ||
    cell.plainBold ||
    fieldHighlighted;
  const price = cell.priceDisplay;
  const isBooleanTrue =
    cell.isBooleanTrue === true || cell.text === "○";

  if (price) {
    return (
      <span
        className={cn(
          "compare-cell-value inline-flex w-full max-w-full flex-col items-center justify-center gap-0.5 leading-snug",
          active && cell.isBest && "scale-[1.02]",
        )}
      >
        {cell.isBest && cell.bestLabel ? (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 whitespace-nowrap font-bold text-[var(--accent)]",
              compact ? "text-[9px] sm:text-[10px]" : "text-[10px] sm:text-[11px]",
            )}
          >
            <span aria-hidden>⭐</span>
            <span className="jp-keep">{cell.bestLabel}</span>
          </span>
        ) : null}
        {price.regularText ? (
          <span
            className={cn(
              "text-[var(--text-muted)] line-through",
              compact ? "text-[10px] sm:text-[11px]" : "text-[11px] sm:text-[12px]",
            )}
          >
            {price.regularText}
          </span>
        ) : null}
        <span
          className={cn(
            "font-bold",
            compact
              ? "text-[13px] sm:text-[14px]"
              : "text-[15px] sm:text-[16px]",
            emphasize || price.regularText
              ? "text-[var(--accent)]"
              : "text-[var(--text-primary)]",
          )}
        >
          {price.campaignText}
        </span>
      </span>
    );
  }

  if (cell.plainBold && !cell.emphasize && !cell.isBest) {
    // 後方互換: plainBold のみ → 青太字へ統一
    return (
      <span
        className={cn(
          "compare-cell-value inline-flex font-bold text-[var(--accent)]",
          compact
            ? "text-[13px] sm:text-[14px]"
            : "text-[15px] sm:text-[16px]",
        )}
      >
        <span className="jp-keep">{cell.text}</span>
      </span>
    );
  }

  const multiline = cell.text.includes("\n");
  const lines = cell.text
    .split(/\n| \/ /)
    .map((s) => s.trim())
    .filter(Boolean);
  const isSupportWrap = /電話|メール|チャット/.test(cell.text) && cell.text.includes("・");
  const isMulti =
    !isSupportWrap &&
    lines.length > 1 &&
    /○|情報確認中|要問い合わせ|—|-/.test(cell.text);
  const preferNowrap =
    !multiline &&
    !isMulti &&
    !isSupportWrap &&
    !isBooleanTrue &&
    (cell.text.length <= 14 ||
      /^[¥￥]?[\d,.]+\s*[A-Za-zぁ-んァ-ン一-龥]*$/.test(cell.text));
  /** 「・」の直後で自然に折り返せるようにする */
  const supportText = isSupportWrap
    ? cell.text.replace(/・/g, "・\u200b")
    : cell.text;

  return (
    <span
      className={cn(
        "compare-cell-value inline-flex w-full max-w-full flex-col items-center gap-0.5 leading-snug",
        isBooleanTrue
          ? cn(
              "font-bold text-[var(--navy)]",
              compact
                ? "text-[14px] sm:text-[15px]"
                : "text-[16px] sm:text-[18px]",
            )
          : emphasize
            ? cn(
                "font-bold text-[var(--accent)]",
                compact
                  ? "text-[12px] sm:text-[13px]"
                  : "text-[14px] sm:text-[16px]",
              )
            : cn(
                "font-medium text-[var(--text-primary)]",
                compact
                  ? "text-[11px] sm:text-[12px]"
                  : "text-[13px] sm:text-[14px]",
              ),
        active && cell.isBest && "scale-[1.02]",
      )}
    >
      {cell.isBest && cell.bestLabel ? (
        <span
          className={cn(
            "inline-flex items-center gap-0.5 whitespace-nowrap font-bold text-[var(--accent)]",
            compact ? "text-[9px] sm:text-[10px]" : "text-[10px] sm:text-[11px]",
          )}
        >
          <span aria-hidden>⭐</span>
          <span className="jp-keep">{cell.bestLabel}</span>
        </span>
      ) : null}
      {isMulti ? (
        <span className="flex max-w-full flex-col items-center gap-0.5 text-pretty">
          {lines.map((line) => (
            <span key={line} className="jp-keep break-words">
              {line}
            </span>
          ))}
        </span>
      ) : (
        <span
          className={cn(
            "w-full text-pretty text-center",
            isSupportWrap
              ? "break-words jp-break"
              : multiline
                ? "whitespace-pre-line break-words jp-break"
                : preferNowrap
                  ? "whitespace-nowrap jp-break"
                  : "break-words jp-break",
          )}
        >
          {isSupportWrap ? supportText : cell.text}
        </span>
      )}
    </span>
  );
});
