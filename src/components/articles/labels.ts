import type { ArticleStatus, ArticleCategory, ArticleSignature } from "@/lib/articles";

// Signature publique : nom de l'auteur, ou « Βιβλίον » si signature collective.
export const byline = (a: { signature: ArticleSignature; author: { name: string } }): string =>
  a.signature === "collective" ? "Βιβλίον" : a.author.name || "Anaginosko";

export const STATUS_LABEL: Record<ArticleStatus, string> = {
  draft: "Brouillon",
  in_review: "En revue",
  changes_requested: "Modifications demandées",
  published: "Publié",
  archived: "Archivé",
};

export const STATUS_BADGE: Record<ArticleStatus, string> = {
  draft: "badge-ghost",
  in_review: "badge-warning",
  changes_requested: "badge-error",
  published: "badge-success",
  archived: "badge-neutral",
};

export const CATEGORY_LABEL: Record<ArticleCategory, string> = {
  site: "Site",
  philologie: "Philologie",
};
