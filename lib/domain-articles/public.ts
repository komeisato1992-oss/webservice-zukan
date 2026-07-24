import { createPublicClient } from "@/lib/supabase/public";
import {
  DOMAIN_BEGINNER_ARTICLES,
  getDomainBeginnerArticle,
  type DomainBeginnerArticle,
} from "@/lib/domain-articles/registry";

export type PublishedDomainArticle = {
  slug: string;
  title: string;
  description: string;
  html: string;
  toc: DomainBeginnerArticle["toc"];
  publishedAt: string | null;
  updatedAt: string | null;
  source: "database" | "fallback";
};

/**
 * 公開記事を取得。管理画面（managed_contents）を優先し、なければレジストリ HTML を使う。
 */
export async function loadDomainBeginnerArticle(
  slug: string,
): Promise<PublishedDomainArticle | null> {
  const meta = getDomainBeginnerArticle(slug);
  if (!meta) return null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createPublicClient() as any;
    const { data, error } = await supabase
      .from("managed_contents")
      .select("title, summary, body, published_at, updated_at, status, is_checked")
      .eq("source_type", meta.sourceType)
      .is("deleted_at", null)
      .eq("status", "published")
      .eq("is_checked", true)
      .maybeSingle();

    if (!error && data?.body?.trim()) {
      return {
        slug: meta.slug,
        title: String(data.title || meta.title),
        description: String(data.summary || meta.description),
        html: String(data.body),
        toc: meta.toc,
        publishedAt: data.published_at ?? null,
        updatedAt: data.updated_at ?? null,
        source: "database",
      };
    }
  } catch {
    // 公開クライアント未設定時などはフォールバック
  }

  return {
    slug: meta.slug,
    title: meta.title,
    description: meta.description,
    html: meta.defaultHtml,
    toc: meta.toc,
    publishedAt: null,
    updatedAt: null,
    source: "fallback",
  };
}

export function listDomainBeginnerFallbacks() {
  return DOMAIN_BEGINNER_ARTICLES;
}
