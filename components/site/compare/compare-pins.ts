"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

const STORAGE_KEY = "zukan-compare-pins-v1";

let memoryPins: string[] = [];
let clientInitialized = false;
const listeners = new Set<() => void>();

function readStorage(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s): s is string => typeof s === "string" && s.length > 0);
  } catch {
    return [];
  }
}

function writeStorage(slugs: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs));
    window.dispatchEvent(new Event("zukan-compare-pins-change"));
  } catch {
    // ignore
  }
}

function ensureInit() {
  if (clientInitialized || typeof window === "undefined") return;
  memoryPins = readStorage();
  clientInitialized = true;
}

function emit() {
  for (const l of listeners) l();
}

function setPins(next: string[]) {
  memoryPins = next;
  writeStorage(next);
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) {
      memoryPins = readStorage();
      listener();
    }
  };
  const onCustom = () => {
    memoryPins = readStorage();
    listener();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener("zukan-compare-pins-change", onCustom);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("zukan-compare-pins-change", onCustom);
  };
}

function getSnapshot() {
  ensureInit();
  return memoryPins;
}

const SERVER_SNAPSHOT: string[] = [];
function getServerSnapshot() {
  return SERVER_SNAPSHOT;
}

/**
 * ピン固定 slug 配列（ピンした順）。localStorage で永続化。
 */
export function useComparePins(validSlugs: Set<string>) {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const pinnedSlugs = useMemo(
    () => raw.filter((slug) => validSlugs.has(slug)),
    [raw, validSlugs],
  );

  const isPinned = useCallback(
    (slug: string) => pinnedSlugs.includes(slug),
    [pinnedSlugs],
  );

  const togglePin = useCallback((slug: string) => {
    ensureInit();
    if (memoryPins.includes(slug)) {
      setPins(memoryPins.filter((s) => s !== slug));
      return;
    }
    setPins([...memoryPins, slug]);
  }, []);

  const unpinMany = useCallback((slugs: string[]) => {
    if (slugs.length === 0) return;
    const drop = new Set(slugs);
    ensureInit();
    setPins(memoryPins.filter((s) => !drop.has(s)));
  }, []);

  const clearPins = useCallback(() => setPins([]), []);

  return { pinnedSlugs, isPinned, togglePin, unpinMany, clearPins };
}

/** ピン済みを左へ、未ピンは baseOrder の順で並べる */
export function orderWithPins<T>(
  items: T[],
  pinnedSlugs: string[],
  getSlug: (item: T) => string,
): T[] {
  const bySlug = new Map(items.map((item) => [getSlug(item), item]));
  const pinned: T[] = [];
  for (const slug of pinnedSlugs) {
    const item = bySlug.get(slug);
    if (item) pinned.push(item);
  }
  const pinnedSet = new Set(pinnedSlugs);
  const rest = items.filter((item) => !pinnedSet.has(getSlug(item)));
  return [...pinned, ...rest];
}
