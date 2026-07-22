import {
  BarChart3,
  CheckCircle2,
  Layers,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import { ICON_SM } from "@/components/site/ui";

type StatItem = {
  id: string;
  icon: LucideIcon;
  value: string;
  label: string;
};

type Props = {
  serviceCount: number;
  fieldCount: number;
};

/**
 * 比較ページタイトル下の情報カード（4項目）。
 * 文字サイズは維持し、上下余白のみコンパクト。
 */
export function CompareIntroStats({ serviceCount, fieldCount }: Props) {
  const items: StatItem[] = [
    {
      id: "services",
      icon: BarChart3,
      value: `${serviceCount}サービス掲載`,
      label: "主要レンタルサーバーを掲載",
    },
    {
      id: "fields",
      icon: CheckCircle2,
      value: `${fieldCount}項目で比較`,
      label: "同じ基準で並べて確認",
    },
    {
      id: "plans",
      icon: Layers,
      value: "複数プラン対応",
      label: "プランを切り替えて比較",
    },
    {
      id: "update",
      icon: RefreshCw,
      value: "毎日更新",
      label: "掲載内容を継続的に確認",
    },
  ];

  return (
    <section
      aria-label="比較ページの特徴"
      className="mt-3 overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-white sm:mt-3.5"
    >
      <div className="grid grid-cols-2 lg:grid-cols-4">
        {items.map((item, index) => {
          const Icon = item.icon;
          const isLeft = index % 2 === 0;
          const isTop = index < 2;
          return (
            <div
              key={item.id}
              className={[
                /* 余白のみ圧縮（文字サイズは維持） */
                "flex flex-col items-start gap-1 px-3 py-1.5 sm:gap-1.5 sm:px-4 sm:py-2",
                "border-[var(--border)]",
                isLeft ? "border-r" : "",
                isTop ? "border-b lg:border-b-0" : "",
                "lg:border-r lg:last:border-r-0",
                index === 1 ? "lg:border-r" : "",
                index === 2 ? "lg:border-r" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[var(--navy)] sm:h-7 sm:w-7">
                <Icon size={ICON_SM} strokeWidth={1.75} aria-hidden />
              </span>
              <div className="min-w-0 w-full">
                <p className="text-[13px] font-bold leading-snug tracking-tight text-[var(--navy)] sm:text-[14px]">
                  <span className="jp-keep">{item.value}</span>
                </p>
                <p className="mt-0.5 line-clamp-1 text-[11px] leading-snug text-[var(--text-muted)] sm:text-[12px]">
                  <span className="jp-keep">{item.label}</span>
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
