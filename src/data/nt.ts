import type { Text, Mot } from "./texts";

export type NtBook = { id: string; name: string; usfm: string; chapters: number };

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

const base = import.meta.env.BASE_URL;

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
