"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { EnrichedService } from "@/lib/site/service-utils";
import { withSelectedPlan } from "@/lib/site/plan-utils";

const PLAN_STORAGE_KEY = "zukan-compare-plans-v1";

let memoryPlans: Record<string, string> = {};
let clientInitialized = false;
const listeners = new Set<() => void>();

function readPlanStorage(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PLAN_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    if (!parsed || typeof parsed !== "object") return {};
    const next: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof k === "string" && typeof v === "string") next[k] = v;
    }
    return next;
  } catch {
    return {};
  }
}

function writePlanStorage(map: Record<string, string>) {
  try {
    window.localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore quota
  }
}

function ensureClientInit() {
  if (clientInitialized || typeof window === "undefined") return;
  memoryPlans = readPlanStorage();
  clientInitialized = true;
}

function getSnapshot(): Record<string, string> {
  ensureClientInit();
  return memoryPlans;
}

const SERVER_SNAPSHOT: Record<string, string> = {};

function getServerSnapshot(): Record<string, string> {
  return SERVER_SNAPSHOT;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === PLAN_STORAGE_KEY || e.key === null) {
      memoryPlans = readPlanStorage();
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

function setPlans(next: Record<string, string>) {
  memoryPlans = next;
  writePlanStorage(next);
  emit();
}

/**
 * サービスごとの選択プランIDを管理し、比較用にマージ済み EnrichedService を返す。
 * 選択プランは localStorage に永続化し、比較ページと TOP で共有する。
 */
export function usePlanSelection(services: EnrichedService[]) {
  const stored = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const defaultMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const item of services) {
      const id = item.representativePlan?.id;
      if (id) map[item.service.id] = id;
    }
    return map;
  }, [services]);

  const selectedPlanIds = useMemo(() => {
    const merged = { ...defaultMap, ...stored };
    const allowed = new Set(services.map((s) => s.service.id));
    const next: Record<string, string> = {};
    for (const [id, planId] of Object.entries(merged)) {
      if (allowed.has(id)) next[id] = planId;
    }
    return next;
  }, [defaultMap, stored, services]);

  const setPlan = useCallback((serviceId: string, planId: string) => {
    ensureClientInit();
    setPlans({ ...readPlanStorage(), [serviceId]: planId });
  }, []);

  const resolvedServices = useMemo(
    () =>
      services.map((item) =>
        withSelectedPlan(item, selectedPlanIds[item.service.id]),
      ),
    [services, selectedPlanIds],
  );

  return { selectedPlanIds, setPlan, resolvedServices };
}
