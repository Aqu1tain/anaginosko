import type { Text, Mot } from "./texts";
import type { Gloss } from "./glosses";

export type NtBook = { id: string; name: string; usfm: string; chapters: number; words: number };

// Ordre canonique des 27 livres.
export const BOOK_ORDER = [
  "mt", "mk", "lk", "jn", "ac", "ro", "1co", "2co", "ga", "eph", "php", "col",
  "1th", "2th", "1ti", "2ti", "tit", "phm", "heb", "jas", "1pe", "2pe", "1jn",
  "2jn", "3jn", "jud", "re",
] as const;

// Ensembles de corpus pour le profil de distribution (couvre les 27 livres).
export const CORPUS_GROUPS: { id: string; title: string; short: string; books: string[]; color: string }[] = [
  { id: "syn", title: "Synoptiques", short: "Syn.", books: ["mt", "mk", "lk"], color: "#4f86c6" },
  { id: "ac", title: "Actes", short: "Actes", books: ["ac"], color: "#5bb5b0" },
  { id: "joh", title: "Corpus johannique", short: "Joh.", books: ["jn", "1jn", "2jn", "3jn"], color: "#8b5cf6" },
  { id: "paul", title: "Épîtres pauliniennes", short: "Paul", books: ["ro", "1co", "2co", "ga", "eph", "php", "col", "1th", "2th", "phm"], color: "#e0823d" },
  { id: "past", title: "Pastorales", short: "Past.", books: ["1ti", "2ti", "tit"], color: "#e6b13e" },
  { id: "cath", title: "Épîtres catholiques", short: "Cath.", books: ["heb", "jas", "1pe", "2pe", "jud"], color: "#4cae7e" },
  { id: "apo", title: "Apocalypse", short: "Apoc.", books: ["re"], color: "#d8485a" },
];

const GROUP_BY_BOOK: Record<string, (typeof CORPUS_GROUPS)[number]> = {};
for (const g of CORPUS_GROUPS) for (const b of g.books) GROUP_BY_BOOK[b] = g;
export const corpusOf = (book: string) => GROUP_BY_BOOK[book];

// Noms des livres (bundlé, pour les titres synchrones de la barre du haut).
export const BOOK_NAMES: Record<string, string> = {
  mt: "Matthieu", mk: "Marc", lk: "Luc", jn: "Jean", ac: "Actes",
  ro: "Romains", "1co": "1 Corinthiens", "2co": "2 Corinthiens", ga: "Galates",
  eph: "Éphésiens", php: "Philippiens", col: "Colossiens", "1th": "1 Thessaloniciens",
  "2th": "2 Thessaloniciens", "1ti": "1 Timothée", "2ti": "2 Timothée", tit: "Tite",
  phm: "Philémon", heb: "Hébreux", jas: "Jacques", "1pe": "1 Pierre", "2pe": "2 Pierre",
  "1jn": "1 Jean", "2jn": "2 Jean", "3jn": "3 Jean", jud: "Jude", re: "Apocalypse",
};

// Regroupement éditorial pour la table des matières.
export const NT_GROUPS: { title: string; ids: string[] }[] = [
  { title: "Évangiles", ids: ["mt", "mk", "lk", "jn"] },
  { title: "Actes", ids: ["ac"] },
  { title: "Épîtres de Paul", ids: ["ro", "1co", "2co", "ga", "eph", "php", "col", "1th", "2th", "1ti", "2ti", "tit", "phm"] },
  { title: "Épîtres générales", ids: ["heb", "jas", "1pe", "2pe", "1jn", "2jn", "3jn", "jud"] },
  { title: "Apocalypse", ids: ["re"] },
];

// Données servies à la racine par nginx (/nt/...). Les fonctions fetch ci-dessous
// tournent côté client au runtime ; le SSG passe par lib/nt-server.ts (fs).
const base = "/";

type FrenchByChapter = Record<string, Record<string, string>>;

let booksCache: NtBook[] | null = null;
const chapterCache = new Map<string, Text>();
const frenchCache = new Map<string, FrenchByChapter | null>();

async function loadFrench(book: string): Promise<FrenchByChapter | null> {
  if (frenchCache.has(book)) return frenchCache.get(book)!;
  try {
    const res = await fetch(`${base}nt/${book}/fr.json`);
    const data = res.ok ? ((await res.json()) as FrenchByChapter) : null;
    frenchCache.set(book, data);
    return data;
  } catch {
    frenchCache.set(book, null);
    return null;
  }
}

export async function loadBooks(): Promise<NtBook[]> {
  if (booksCache) return booksCache;
  const res = await fetch(`${base}nt/books.json`);
  const data = (await res.json()) as { books: NtBook[] };
  booksCache = data.books;
  return booksCache;
}

export function bookById(books: NtBook[], id: string): NtBook | undefined {
  return books.find((b) => b.id === id);
}

// --- Concordance NT (index des lemmes + occurrences à la demande) ---

export type LemmaEntry = {
  lemma: string;
  nature: string;
  count: number;
  translit: string; // érasmien
  translitR: string; // restituée
  oid: number;
};

export type Occ = { b: string; c: number; v: number; w: number; f: string };

let lemmaIndexCache: LemmaEntry[] | null = null;
const occCache = new Map<number, Occ[]>();

export async function loadLemmaIndex(): Promise<LemmaEntry[]> {
  if (lemmaIndexCache) return lemmaIndexCache;
  const res = await fetch(`${base}nt/lemmas.json`);
  lemmaIndexCache = (await res.json()) as LemmaEntry[];
  return lemmaIndexCache;
}

export async function loadOccurrences(oid: number): Promise<Occ[]> {
  const cached = occCache.get(oid);
  if (cached) return cached;
  const res = await fetch(`${base}nt/occ/${oid}.json`);
  const data = (await res.json()) as Occ[];
  occCache.set(oid, data);
  return data;
}

// Voisins lexicaux (collocations PMI au niveau du verset). `verses` liste les
// versets communs (plafonnés) pour les déplier sous le mot, comme la répartition.
export type VerseRef = { b: string; c: number; v: number };
export type Colloc = {
  oid: number;
  lemma: string;
  translitR: string;
  score: number;
  n: number;
  verses?: VerseRef[];
};

// Distribution par livre (non plafonnée), pour le profil de distribution.
export type Distribution = Record<string, number>;
const distCache = new Map<number, Distribution>();

export async function loadDistribution(oid: number): Promise<Distribution> {
  const cached = distCache.get(oid);
  if (cached) return cached;
  const res = await fetch(`${base}nt/distribution/${oid}.json`);
  const data = (await res.json()) as Distribution;
  distCache.set(oid, data);
  return data;
}

const COMBINING = /[̀-ͯ]/g;
const fold = (s: string): string => s.normalize("NFD").replace(COMBINING, "").toLowerCase();

/**
 * Recherche tolérante aux accents : grec, restituée OU érasmien (caractères
 * latins). La restituée est privilégiée (meilleur score) ; à score égal, les
 * lemmes les plus fréquents d'abord.
 */
export function searchLemmaIndex(index: LemmaEntry[], query: string): LemmaEntry[] {
  const q = fold(query.trim());
  if (!q) return index;
  const scored: { e: LemmaEntry; score: number }[] = [];
  for (const e of index) {
    const r = fold(e.translitR);
    const er = fold(e.translit);
    const l = fold(e.lemma);
    let score = 0;
    if (r.startsWith(q)) score = 6;
    else if (er.startsWith(q)) score = 5;
    else if (r.includes(q)) score = 4;
    else if (er.includes(q)) score = 3;
    else if (l.startsWith(q)) score = 2;
    else if (l.includes(q)) score = 1;
    if (score > 0) scored.push({ e, score });
  }
  scored.sort((a, b) => b.score - a.score || b.e.count - a.e.count);
  return scored.map((s) => s.e);
}

export const lemmaEntry = (index: LemmaEntry[], lemma: string): LemmaEntry | undefined =>
  index.find((e) => e.lemma === lemma);

// --- Gloses Bailly pour tout le NT (chargées une fois, à la demande) ---

let glossesCache: Record<string, Gloss> | null = null;
let glossesPromise: Promise<void> | null = null;

export function prefetchGlosses(): void {
  if (glossesCache || glossesPromise) return;
  glossesPromise = fetch(`${base}nt/glosses.json`)
    .then((r) => (r.ok ? r.json() : {}))
    .then((data) => {
      glossesCache = data as Record<string, Gloss>;
    })
    .catch(() => {
      glossesCache = {};
    });
}

/** Glose NT si déjà chargée (sinon undefined). Déclenche le préchargement. */
export function ntGlossFor(lemma: string | null | undefined): Gloss | undefined {
  if (!glossesCache) {
    prefetchGlosses();
    return undefined;
  }
  return lemma ? glossesCache[lemma] : undefined;
}

/** Charge un chapitre et l'adapte au type Text consommé par le Reader. */
export async function loadChapter(book: string, chapter: number): Promise<Text> {
  const key = `${book}/${chapter}`;
  const cached = chapterCache.get(key);
  if (cached) return cached;

  const [res, french] = await Promise.all([
    fetch(`${base}nt/${book}/${chapter}.json`),
    loadFrench(book),
  ]);
  if (!res.ok) throw new Error(`Chapitre introuvable : ${key}`);
  const data = (await res.json()) as { reference: string; mots: Mot[] };

  const text: Text = {
    id: `nt-${book}-${chapter}`,
    collection: "nt",
    niveau: 0,
    reference: data.reference,
    grec: "",
    francais: french?.[chapter] ?? null,
    translitErasmien: null,
    translitRestituee: null,
    mots: data.mots,
  };
  chapterCache.set(key, text);
  return text;
}
