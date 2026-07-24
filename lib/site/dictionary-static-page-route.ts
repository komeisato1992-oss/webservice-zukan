import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  buildDictionaryStaticPageMetadata,
  dictionaryStaticPageTitle,
  getDictionarySiteProfile,
  isDictionarySiteKey,
  type DictionarySiteKey,
  type DictionarySiteProfile,
  type DictionaryStaticPageKind,
} from "@/lib/site/dictionary-static-pages";

type RouteParams = { categorySlug: string };

export function generateDictionaryStaticParams() {
  return [{ categorySlug: "server" }, { categorySlug: "domain" }];
}

export async function resolveDictionaryStaticProfile(
  params: Promise<RouteParams>,
): Promise<DictionarySiteProfile> {
  const { categorySlug } = await params;
  if (!isDictionarySiteKey(categorySlug)) notFound();
  return getDictionarySiteProfile(categorySlug);
}

export async function buildDictionaryStaticMetadata(
  params: Promise<RouteParams>,
  kind: DictionaryStaticPageKind,
): Promise<Metadata> {
  const { categorySlug } = await params;
  if (!isDictionarySiteKey(categorySlug)) {
    return { title: dictionaryStaticPageTitle(kind) };
  }
  return buildDictionaryStaticPageMetadata(
    categorySlug as DictionarySiteKey,
    kind,
  );
}
