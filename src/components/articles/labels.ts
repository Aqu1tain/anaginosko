import type { ArticleStatus } from "@/lib/articles";
import { ARTICLE_CATEGORIES } from "@/src/data/articleCategories";

export const STATUS_LABEL: Record<ArticleStatus, string> = {
  draft: "Brouillon",
  in_review: "En revue",
  changes_requested: "Modifications demandées",
  published: "Publié",
  approved: "Approuvé · à publier",
  archived: "Archivé",
};

export const STATUS_BADGE: Record<ArticleStatus, string> = {
  draft: "badge-ghost",
  in_review: "badge-warning",
  changes_requested: "badge-error",
  published: "badge-success",
  approved: "badge-info",
  archived: "badge-neutral",
};

export const STATUS_DOT: Record<ArticleStatus, string> = {
  draft: "bg-base-content/30",
  in_review: "bg-warning",
  changes_requested: "bg-error",
  published: "bg-success",
  approved: "bg-info",
  archived: "bg-base-content/20",
};

export const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  ARTICLE_CATEGORIES.map((c) => [c.id, c.label]),
);
