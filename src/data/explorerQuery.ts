// État de l'explorateur de la concordance, porté par l'URL. Module pur, partagé
// entre la page serveur et ses contrôles client.

export const PAGE_SIZE = 50;
export const CORPUS_FILTERS = ["all", "nt", "lxx"] as const;
export const FREQ_FILTERS = {
  all: "Toutes fréquences",
  hapax: "Hapax (1)",
  rare: "Rares (2 à 9)",
  common: "Courants (10 à 99)",
  frequent: "Très fréquents (100 et plus)",
} as const;
export const SORTS = { freq: "Les plus fréquents", alpha: "Ordre alphabétique", relevance: "Pertinence" } as const;
export const INITIALS = "ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ".split("");

export type CorpusFilter = (typeof CORPUS_FILTERS)[number];
export type FreqFilter = keyof typeof FREQ_FILTERS;
export type Sort = keyof typeof SORTS;
export type ExplorerQuery = {
  q: string;
  corpus: CorpusFilter;
  nature: string | null;
  freq: FreqFilter;
  initial: string | null;
  sort: Sort;
  page: number;
};

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const pick = <T extends string>(v: string, allowed: readonly T[], fallback: T): T => (allowed.includes(v as T) ? (v as T) : fallback);

export function parseQuery(params: Params, defaultCorpus: CorpusFilter = "all"): ExplorerQuery {
  const q = one(params.q).trim().slice(0, 80);
  const initial = one(params.lettre).toUpperCase();
  return {
    q,
    corpus: pick(one(params.corpus), CORPUS_FILTERS, defaultCorpus),
    nature: one(params.nature) || null,
    freq: pick(one(params.freq), Object.keys(FREQ_FILTERS) as FreqFilter[], "all"),
    initial: INITIALS.includes(initial) ? initial : null,
    sort: pick(one(params.tri), Object.keys(SORTS) as Sort[], q ? "relevance" : "freq"),
    page: Math.max(1, Math.min(10_000, Number(one(params.page)) || 1)),
  };
}

// Paramètres d'URL d'une requête, sans les valeurs par défaut.
export function queryString(query: ExplorerQuery, patch: Partial<ExplorerQuery> = {}, defaultCorpus: CorpusFilter = "all"): string {
  const next = { ...query, ...patch };
  const p = new URLSearchParams();
  if (next.q) p.set("q", next.q);
  if (next.corpus !== defaultCorpus) p.set("corpus", next.corpus);
  if (next.nature) p.set("nature", next.nature);
  if (next.freq !== "all") p.set("freq", next.freq);
  if (next.initial) p.set("lettre", next.initial.toLowerCase());
  if (next.sort !== (next.q ? "relevance" : "freq")) p.set("tri", next.sort);
  if (next.page > 1) p.set("page", String(next.page));
  const s = p.toString();
  return s ? `?${s}` : "";
}
