// Registre des catégories d'articles. Module pur (serveur + client) : source
// unique pour la validation, les sélecteurs d'édition et l'affichage public.
// « site » (Vie du site) reste réservée aux admins ; les anciennes valeurs
// (site, philologie) sont conservées pour les articles existants.

export type ArticleCategoryDef = { id: string; label: string };

export const ARTICLE_CATEGORIES: ArticleCategoryDef[] = [
  { id: "site", label: "Vie du site" },
  { id: "philologie", label: "Philologie" },
  { id: "grammaire", label: "Grammaire" },
  { id: "syntaxe", label: "Syntaxe" },
  { id: "morphologie", label: "Morphologie" },
  { id: "vocabulaire", label: "Vocabulaire" },
  { id: "lexicographie", label: "Lexicographie" },
  { id: "etymologie", label: "Étymologie" },
  { id: "prononciation", label: "Prononciation" },
  { id: "koine", label: "Grec koinè" },
  { id: "nouveau-testament", label: "Nouveau Testament" },
  { id: "septante", label: "Septante" },
  { id: "critique-textuelle", label: "Critique textuelle" },
  { id: "manuscrits", label: "Manuscrits" },
  { id: "paleographie", label: "Paléographie" },
  { id: "traduction", label: "Traduction" },
  { id: "exegese", label: "Exégèse" },
  { id: "histoire", label: "Histoire du texte" },
  { id: "theologie", label: "Théologie" },
  { id: "liturgie", label: "Liturgie" },
  { id: "pedagogie", label: "Apprendre le grec" },
];

const byId = new Map(ARTICLE_CATEGORIES.map((c) => [c.id, c.label]));

export const isArticleCategory = (id: unknown): id is string => typeof id === "string" && byId.has(id);
export const categoryLabel = (id: string): string => byId.get(id) ?? id;
// « Vie du site » engage la voix du projet : réservée aux admins.
export const isAdminOnlyCategory = (id: string): boolean => id === "site";
