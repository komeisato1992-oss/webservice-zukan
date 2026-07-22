"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  getPopularServicePresets,
  searchServicePresets,
  type ServicePreset,
} from "@/lib/services/presets";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSelect: (preset: ServicePreset) => void;
  disabled?: boolean;
};

export function ServicePresetPicker({
  value,
  onChange,
  onSelect,
  disabled,
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const suggestions = useMemo(
    () => searchServicePresets(value, 8),
    [value],
  );
  const popular = useMemo(() => getPopularServicePresets(6), []);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function selectPreset(preset: ServicePreset) {
    onSelect(preset);
    setOpen(false);
    setActiveIndex(0);
  }

  return (
    <div ref={rootRef} className="space-y-3">
      <div className="relative">
        <label
          htmlFor="service-name-input"
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          サービス名
        </label>
        <input
          id="service-name-input"
          name="name"
          required
          disabled={disabled}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          value={value}
          placeholder="例: ConoHa、ロリポップ、mixhost"
          onFocus={() => {
            setOpen(true);
            setActiveIndex(0);
          }}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setActiveIndex(0);
          }}
          onKeyDown={(e) => {
            if (!open || suggestions.length === 0) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActiveIndex((i) => (i + 1) % suggestions.length);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIndex(
                (i) => (i - 1 + suggestions.length) % suggestions.length,
              );
            } else if (e.key === "Enter" && suggestions[activeIndex]) {
              e.preventDefault();
              selectPreset(suggestions[activeIndex]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none ring-blue-500 focus:ring-2"
        />

        {open && suggestions.length > 0 ? (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
          >
            {suggestions.map((preset, index) => (
              <li key={preset.id} role="option" aria-selected={index === activeIndex}>
                <button
                  type="button"
                  className={`flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left text-sm ${
                    index === activeIndex ? "bg-blue-50" : "hover:bg-slate-50"
                  }`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => selectPreset(preset)}
                >
                  <span className="font-medium text-slate-900">
                    {preset.name}
                  </span>
                  <span className="text-xs text-slate-500">
                    {preset.slug} · {preset.officialUrl.replace(/^https?:\/\//, "")}
                    {preset.scraperProviderId ? " · 公式情報取得対応" : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-slate-500">よく使う候補</p>
        <div className="flex flex-wrap gap-2">
          {popular.map((preset) => (
            <button
              key={preset.id}
              type="button"
              disabled={disabled}
              onClick={() => selectPreset(preset)}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800 disabled:opacity-60"
            >
              {preset.shortName || preset.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
