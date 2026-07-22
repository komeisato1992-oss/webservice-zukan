"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { PURPOSE_OPTIONS } from "@/lib/site/content";

type PurposeSelectionContextValue = {
  activeId: string | null;
  setActiveId: (id: string | null, opts?: { scroll?: boolean }) => void;
  scrollToRanking: () => void;
  rankingRef: React.RefObject<HTMLDivElement | null>;
  /** ランキング描画後のスクロール要求フラグ */
  pendingScroll: boolean;
  clearPendingScroll: () => void;
};

const PurposeSelectionContext =
  createContext<PurposeSelectionContextValue | null>(null);

function purposeIdFromHash(hash: string): string | null {
  const raw = hash.replace(/^#/, "");
  if (!raw || raw === "purpose-picker") return null;
  const bySection = PURPOSE_OPTIONS.find((o) => o.sectionId === raw);
  if (bySection) return bySection.id;
  return (
    PURPOSE_OPTIONS.find((o) => o.id === raw || `purpose-${o.id}` === raw)
      ?.id ?? null
  );
}

export function PurposeSelectionProvider({ children }: { children: ReactNode }) {
  const [activeId, setActiveIdState] = useState<string | null>(null);
  const [pendingScroll, setPendingScroll] = useState(false);
  const rankingRef = useRef<HTMLDivElement | null>(null);
  const skipHashWrite = useRef(false);

  const scrollToRanking = useCallback(() => {
    const run = (attempt: number) => {
      const el = rankingRef.current;
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      if (attempt < 8) {
        window.setTimeout(() => run(attempt + 1), 50);
      }
    };
    requestAnimationFrame(() => run(0));
  }, []);

  const clearPendingScroll = useCallback(() => {
    setPendingScroll(false);
  }, []);

  const setActiveId = useCallback(
    (id: string | null, opts?: { scroll?: boolean }) => {
      setActiveIdState(id);
      const option = PURPOSE_OPTIONS.find((o) => o.id === id);
      const nextHash = option ? `#${option.sectionId}` : "#purpose-picker";
      skipHashWrite.current = true;
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", nextHash);
      }
      if (opts?.scroll && id) {
        setPendingScroll(true);
      }
    },
    [],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const apply = (scroll: boolean) => {
      if (skipHashWrite.current) {
        skipHashWrite.current = false;
        return;
      }
      const id = purposeIdFromHash(window.location.hash);
      if (!id) return;
      setActiveIdState(id);
      if (scroll) setPendingScroll(true);
    };

    apply(Boolean(window.location.hash));
    const onHash = () => apply(true);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const value = useMemo(
    () => ({
      activeId,
      setActiveId,
      scrollToRanking,
      rankingRef,
      pendingScroll,
      clearPendingScroll,
    }),
    [
      activeId,
      setActiveId,
      scrollToRanking,
      pendingScroll,
      clearPendingScroll,
    ],
  );

  return (
    <PurposeSelectionContext.Provider value={value}>
      {children}
    </PurposeSelectionContext.Provider>
  );
}

export function usePurposeSelection() {
  const ctx = useContext(PurposeSelectionContext);
  if (!ctx) {
    throw new Error(
      "usePurposeSelection must be used within PurposeSelectionProvider",
    );
  }
  return ctx;
}

export function usePurposeSelectionOptional() {
  return useContext(PurposeSelectionContext);
}
