import type {
  ManagedContent,
  ManagedContentStatus,
  ManagedContentType,
} from "@/lib/types/database";

export const CONTENT_TYPE_LABELS: Record<ManagedContentType, string> = {
  ai_article: "AI記事",
  notice: "お知らせ",
  campaign: "キャンペーン",
  feature: "特集記事",
};

export const CONTENT_STATUS_LABELS: Record<ManagedContentStatus, string> = {
  draft: "下書き",
  review: "確認待ち",
  approved: "承認済み",
  published: "公開",
  expired: "終了",
  rejected: "却下",
};

export type PublicContentCard = {
  id: string;
  contentType: ManagedContentType;
  contentTypeLabel: string;
  title: string;
  summary: string | null;
  serviceId: string | null;
  serviceName: string | null;
  serviceSlug: string | null;
  officialUrl: string | null;
  /** officialUrl が affiliate_url 由来のとき true */
  isAffiliate?: boolean;
  sourceUrl: string | null;
  publishedAt: string | null;
  expiresAt: string | null;
  updatedAt: string;
};

export type ArticleCandidateInput = {
  serviceId: string;
  serviceName: string;
  scrapingRunId: string;
  sourceUrl: string | null;
  fetchedAt: string;
  highlights: string[];
  campaignEndDate?: string | null;
  warnings?: string[];
};

export type GeneratedArticleCandidate = {
  title: string;
  summary: string;
  body: string;
  expiresAt: string | null;
  notes: string[];
};

/** 将来の AI 実装へ差し替え可能な共通インターフェース */
export interface ArticleGenerator {
  generate(input: ArticleCandidateInput): Promise<GeneratedArticleCandidate>;
}

export type ManagedContentWithService = ManagedContent & {
  services?: {
    id: string;
    name: string;
    slug: string;
    is_published: boolean;
    official_url: string | null;
  } | null;
};
