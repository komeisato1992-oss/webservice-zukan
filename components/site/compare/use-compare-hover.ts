"use client";

import { useCallback, useRef, useState } from "react";

/**
 * PC: 行/列ホバーハイライト
 * スマホ: タップしたセルを約1秒ハイライト
 * ホバー更新は rAF で間引き、スクロール中の不要再描画を抑える。
 */
export function useCompareHover() {
  const [hoverRow, setHoverRow] = useState<string | null>(null);
  const [hoverCol, setHoverCol] = useState<string | null>(null);
  const [tapKey, setTapKey] = useState<string | null>(null);
  const tapTimer = useRef<number | null>(null);
  const rafId = useRef<number | null>(null);
  const pending = useRef<{ row: string | null; col: string | null } | null>(
    null,
  );
  const current = useRef<{ row: string | null; col: string | null }>({
    row: null,
    col: null,
  });

  const flush = useCallback(() => {
    rafId.current = null;
    const next = pending.current;
    if (!next) return;
    pending.current = null;
    if (
      current.current.row === next.row &&
      current.current.col === next.col
    ) {
      return;
    }
    current.current = next;
    setHoverRow(next.row);
    setHoverCol(next.col);
  }, []);

  const schedule = useCallback(
    (row: string | null, col: string | null) => {
      pending.current = { row, col };
      if (rafId.current != null) return;
      rafId.current = window.requestAnimationFrame(flush);
    },
    [flush],
  );

  const onCellEnter = useCallback(
    (rowId: string, colId: string) => {
      schedule(rowId, colId);
    },
    [schedule],
  );

  const onCellLeave = useCallback(() => {
    schedule(null, null);
  }, [schedule]);

  const onCellTap = useCallback((rowId: string, colId: string) => {
    const key = `${rowId}:${colId}`;
    setTapKey(key);
    if (tapTimer.current) window.clearTimeout(tapTimer.current);
    tapTimer.current = window.setTimeout(() => setTapKey(null), 1000);
  }, []);

  const isHighlighted = useCallback(
    (rowId: string, colId: string) => {
      if (tapKey === `${rowId}:${colId}`) return true;
      if (hoverRow === rowId || hoverCol === colId) return true;
      return false;
    },
    [hoverRow, hoverCol, tapKey],
  );

  return {
    hoverRow,
    hoverCol,
    onCellEnter,
    onCellLeave,
    onCellTap,
    isHighlighted,
  };
}
