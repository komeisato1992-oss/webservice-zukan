import type {
  AfterBuildHandler,
  ExtractHandler,
  FullHandler,
} from "@/lib/scraping/engine/types";

const extractHandlers = new Map<string, ExtractHandler>();
const fullHandlers = new Map<string, FullHandler>();
const afterBuildHandlers = new Map<string, AfterBuildHandler>();

export function registerExtractHandler(name: string, handler: ExtractHandler) {
  extractHandlers.set(name, handler);
}

export function registerFullHandler(name: string, handler: FullHandler) {
  fullHandlers.set(name, handler);
}

export function registerAfterBuildHandler(
  name: string,
  handler: AfterBuildHandler,
) {
  afterBuildHandlers.set(name, handler);
}

export function getExtractHandler(name: string): ExtractHandler {
  const h = extractHandlers.get(name);
  if (!h) throw new Error(`抽出ハンドラ未登録: ${name}`);
  return h;
}

export function getFullHandler(name: string): FullHandler {
  const h = fullHandlers.get(name);
  if (!h) throw new Error(`フルハンドラ未登録: ${name}`);
  return h;
}

export function getAfterBuildHandler(name: string): AfterBuildHandler | null {
  return afterBuildHandlers.get(name) ?? null;
}
