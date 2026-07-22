"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";

import { DEFAULT_MAX_COMPARE } from "@/lib/site/compare-limits";

const STORAGE_KEY = "zukan-compare-v1";
/** ユーザーが意図的に0件にした（クリア／全解除）。デフォルト再適用を抑止 */
const EMPTY_INTENT_KEY = "zukan-compare-empty-intent-v1";

export { DEFAULT_MAX_COMPARE };

type CompareItem = {
  slug: string;
  name: string;
  categorySlug: string;
};

type CompareState = {
  items: CompareItem[];
  add: (item: CompareItem) => void;
  remove: (slug: string) => void;
  toggle: (item: CompareItem) => void;
  clear: () => void;
  /** 選択を丸ごと置き換え（URL指定の優先適用用） */
  replace: (next: CompareItem[]) => void;
  has: (slug: string) => boolean;
  max: number;
  /** ユーザーが0件を意図しているか（デフォルト自動選択の抑止） */
  hasEmptyIntent: () => boolean;
  clearEmptyIntent: () => void;
};

const CompareContext = createContext<CompareState | null>(null);

function readStorage(max: number): CompareItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CompareItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (i) =>
          i &&
          typeof i.slug === "string" &&
          typeof i.name === "string" &&
          typeof i.categorySlug === "string",
      )
      .slice(0, max);
  } catch {
    return [];
  }
}

function writeStorage(items: CompareItem[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore quota errors
  }
}

function readEmptyIntent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(EMPTY_INTENT_KEY) === "1";
  } catch {
    return false;
  }
}

function writeEmptyIntent(value: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (value) window.localStorage.setItem(EMPTY_INTENT_KEY, "1");
    else window.localStorage.removeItem(EMPTY_INTENT_KEY);
  } catch {
    // ignore
  }
}

let memoryItems: CompareItem[] = [];
let clientInitialized = false;
const listeners = new Set<() => void>();

function ensureClientInit(max: number) {
  if (clientInitialized || typeof window === "undefined") return;
  memoryItems = readStorage(max);
  clientInitialized = true;
}

function getSnapshot(): CompareItem[] {
  ensureClientInit(DEFAULT_MAX_COMPARE);
  return memoryItems;
}

const SERVER_SNAPSHOT: CompareItem[] = [];

function getServerSnapshot(): CompareItem[] {
  return SERVER_SNAPSHOT;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) {
      memoryItems = readStorage(DEFAULT_MAX_COMPARE);
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function emit() {
  for (const l of listeners) l();
}

function setItems(next: CompareItem[]) {
  memoryItems = next;
  writeStorage(next);
  emit();
}

export function CompareProvider({
  children,
  max = DEFAULT_MAX_COMPARE,
}: {
  children: React.ReactNode;
  /** 比較上限。省略時はサービス増加に耐えるデフォルト */
  max?: number;
}) {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const maxCompare = Math.max(2, max);

  const add = useCallback(
    (item: CompareItem) => {
      ensureClientInit(maxCompare);
      const current = readStorage(maxCompare);
      if (current.some((i) => i.slug === item.slug)) return;
      if (current.length >= maxCompare) return;
      writeEmptyIntent(false);
      setItems([...current, item]);
    },
    [maxCompare],
  );

  const remove = useCallback(
    (slug: string) => {
      ensureClientInit(maxCompare);
      const next = readStorage(maxCompare).filter((i) => i.slug !== slug);
      if (next.length === 0) writeEmptyIntent(true);
      setItems(next);
    },
    [maxCompare],
  );

  const toggle = useCallback(
    (item: CompareItem) => {
      ensureClientInit(maxCompare);
      const current = readStorage(maxCompare);
      if (current.some((i) => i.slug === item.slug)) {
        const next = current.filter((i) => i.slug !== item.slug);
        if (next.length === 0) writeEmptyIntent(true);
        setItems(next);
        return;
      }
      if (current.length >= maxCompare) return;
      writeEmptyIntent(false);
      setItems([...current, item]);
    },
    [maxCompare],
  );

  const clear = useCallback(() => {
    writeEmptyIntent(true);
    setItems([]);
  }, []);

  const replace = useCallback(
    (next: CompareItem[]) => {
      ensureClientInit(maxCompare);
      const seen = new Set<string>();
      const cleaned: CompareItem[] = [];
      for (const item of next) {
        if (!item?.slug || seen.has(item.slug)) continue;
        seen.add(item.slug);
        cleaned.push(item);
        if (cleaned.length >= maxCompare) break;
      }
      if (cleaned.length > 0) writeEmptyIntent(false);
      setItems(cleaned);
    },
    [maxCompare],
  );

  const has = useCallback(
    (slug: string) => items.some((i) => i.slug === slug),
    [items],
  );

  const hasEmptyIntent = useCallback(() => readEmptyIntent(), []);
  const clearEmptyIntent = useCallback(() => writeEmptyIntent(false), []);

  const value = useMemo(
    () => ({
      items,
      add,
      remove,
      toggle,
      clear,
      replace,
      has,
      max: maxCompare,
      hasEmptyIntent,
      clearEmptyIntent,
    }),
    [
      items,
      add,
      remove,
      toggle,
      clear,
      replace,
      has,
      maxCompare,
      hasEmptyIntent,
      clearEmptyIntent,
    ],
  );

  return (
    <CompareContext.Provider value={value}>{children}</CompareContext.Provider>
  );
}

export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) {
    throw new Error("useCompare must be used within CompareProvider");
  }
  return ctx;
}

export { DEFAULT_MAX_COMPARE as MAX_COMPARE };
