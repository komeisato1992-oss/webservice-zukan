import Link from "next/link";
import { Wallet, ShieldCheck, Headphones, type LucideIcon } from "lucide-react";
import { DOMAIN_COMPARE_GROUP_CARDS } from "@/lib/site/content";
import { SectionHeader, SectionShell, cn } from "@/components/site/ui";

const ICONS: Record<string, LucideIcon> = {
  price: Wallet,
  feature: ShieldCheck,
  support: Headphones,
};

export function DomainCompareGroupCards() {
  return (
    <SectionShell
      id="compare-groups"
      tone="gray"
      className="!py-[calc(var(--section-py)*0.4)] sm:!py-[calc(var(--section-py-md)*0.4)]"
    >
      <SectionHeader
        title="比較で選ぶ"
        description="料金・機能・サポートの観点で、ドメインサービスを比較できます。"
        emphasis
        className="!mb-0"
      />
      <ul className="mt-4 grid gap-2.5 sm:mt-5 sm:grid-cols-3 sm:gap-3">
        {DOMAIN_COMPARE_GROUP_CARDS.map((card) => {
          const Icon = ICONS[card.group] ?? Wallet;
          return (
            <li key={card.group}>
              <Link
                href={card.href}
                className={cn(
                  "flex h-full min-h-[5.5rem] flex-col rounded-[var(--radius-card)] border border-[var(--border)] bg-white px-3.5 py-3.5 transition duration-150",
                  "hover:-translate-y-0.5 hover:border-[var(--navy)]/35 hover:shadow-[var(--shadow-card-hover)]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/35",
                )}
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--navy)]">
                  <Icon size={16} strokeWidth={1.75} aria-hidden />
                </span>
                <span className="mt-2.5 text-[14px] font-bold text-[var(--text-primary)] sm:text-[15px]">
                  {card.title}
                </span>
                <span className="mt-1 text-[12px] leading-snug text-[var(--text-body)]">
                  {card.description}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </SectionShell>
  );
}
