import {
  BarChart3,
  CheckCircle2,
  Compass,
  Sparkles,
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

export function HeroStats({ serviceCount, fieldCount }: Props) {
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
      id: "beginner",
      icon: Sparkles,
      value: "初心者にも分かりやすい",
      label: "用語や選び方も整理",
    },
    {
      id: "purpose",
      icon: Compass,
      value: "用途に合わせて提案",
      label: "条件から候補を絞り込み",
    },
  ];

  return (
    <section
      aria-label="サイトの特徴"
      className="border-b border-[var(--border)] bg-white"
    >
      <div className="mx-auto grid max-w-[var(--container-max)] grid-cols-2 lg:grid-cols-4">
        {items.map((item, index) => {
          const Icon = item.icon;
          const isLeft = index % 2 === 0;
          const isTop = index < 2;
          return (
            <div
              key={item.id}
              className={[
                /* 上下余白を圧縮（文字サイズは維持） */
                "flex h-full flex-col items-start gap-1 px-4 py-1.5 sm:gap-1.5 sm:px-5 sm:py-2",
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
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-[var(--text-muted)] sm:text-[12px]">
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
