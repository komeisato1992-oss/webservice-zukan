"use client";

import { Check, HelpCircle, X, type LucideIcon } from "lucide-react";

export type TriState = boolean | null;

type Props = {
  value: TriState;
  onChange: (value: TriState) => void;
  name?: string;
  disabled?: boolean;
};

type Option = {
  value: TriState;
  label: string;
  icon: LucideIcon;
  activeClass: string;
};

const OPTIONS: Option[] = [
  {
    value: true,
    label: "あり",
    icon: Check,
    activeClass: "border-emerald-500 bg-emerald-50 text-emerald-800",
  },
  {
    value: false,
    label: "なし",
    icon: X,
    activeClass: "border-slate-400 bg-slate-100 text-slate-700",
  },
  {
    value: null,
    label: "要確認",
    icon: HelpCircle,
    activeClass: "border-amber-500 bg-amber-50 text-amber-800",
  },
];

/** boolean|null の3択セグメント（あり／なし／要確認）。タップ領域を大きく確保する。 */
export function TriStateControl({ value, onChange, name, disabled = false }: Props) {
  return (
    <div role="radiogroup" aria-label={name} className="grid grid-cols-3 gap-2">
      {OPTIONS.map((option) => {
        const selected = value === option.value;
        const Icon = option.icon;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg border px-2 py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              selected
                ? option.activeClass
                : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Icon className="size-4" aria-hidden />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
