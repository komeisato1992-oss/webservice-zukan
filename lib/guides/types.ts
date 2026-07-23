import type { ComponentType } from "react";
import type { ComparisonField } from "@/lib/types/database";
import type { EnrichedService } from "@/lib/site/service-utils";

export type GuideCategory =
  | "おすすめ"
  | "比較"
  | "初心者"
  | "WordPress"
  | "格安"
  | "高速"
  | "法人";

export type GuideTocItem = {
  id: string;
  label: string;
};

export type GuideRelatedLink = {
  href: string;
  label: string;
};

export type GuideArticleProps = {
  services: EnrichedService[];
  compareServices: EnrichedService[];
  comparisonFields: ComparisonField[];
  allSlugs: string[];
};

export type GuideArticleMeta = {
  slug: string;
  title: string;
  description: string;
  categories: GuideCategory[];
  publishedAt: string;
  updatedAt: string;
  toc: GuideTocItem[];
  related: GuideRelatedLink[];
  Content: ComponentType<GuideArticleProps>;
};
