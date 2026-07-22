import { Info } from "lucide-react";
import { cn } from "@/components/site/ui";

type Props = {
  /** short: 人気3社向けの短縮版 */
  variant?: "full" | "short";
  className?: string;
};

const FULL_NOTE =
  "料金は12か月契約を目安に比較しています。契約期間やキャンペーンによって内容が異なる場合があるため、お申し込み前に必ず公式サイトで最新情報をご確認ください。";

const SHORT_NOTE =
  "料金は12か月契約を目安に表示しています。最新情報は公式サイトでご確認ください。";

/** 比較表上部の契約条件注記 */
export function CompareTableNote({
  variant = "full",
  className,
}: Props) {
  return (
    <p
      className={cn(
        "flex items-start gap-1.5 text-[11px] leading-relaxed text-[var(--text-muted)] sm:text-[12px]",
        className,
      )}
    >
      <Info
        size={14}
        strokeWidth={2}
        className="mt-0.5 shrink-0 text-[var(--text-muted)]"
        aria-hidden
      />
      <span className="text-pretty">
        {variant === "short" ? SHORT_NOTE : FULL_NOTE}
      </span>
    </p>
  );
}
