import { CORPORA, corpusById } from "./corpus";

// Parsing de références bibliques libres pour les citations d'articles. Étend la
// logique de RefJump (pliage d'accents, correspondance nom/id) avec les versets et
// les plages : « Jean 1:1-18 », « Gen 1,1-3 », « gen 1 », « 1co 13 ». Module pur
// (ni server-only ni client) : partagé par le picker, l'éditeur et le rendu public.

const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();

export type BookMatch = { corpus: string; book: string; name: string };
export type CitationRef = { corpus: string; book: string; chapter: number; verseStart?: number; verseEnd?: number };

// Résout une saisie de livre (nom ou id, insensible aux accents) vers un livre d'un
// corpus. NT prioritaire puis LXX ; priorité aux préfixes de nom, comme RefJump.
export function matchBooks(query: string, limit = 6): BookMatch[] {
  const q = norm(query);
  if (!q) return [];
  const cands: (BookMatch & { rank: number })[] = [];
  for (const c of CORPORA) {
    for (const book of c.bookOrder) {
      const name = c.bookNames[book] ?? book;
      const nn = norm(name);
      const ni = norm(book);
      if (nn.includes(q) || ni.startsWith(q)) {
        cands.push({ corpus: c.id, book, name, rank: nn.startsWith(q) ? 0 : ni.startsWith(q) ? 1 : 2 });
      }
    }
  }
  cands.sort((a, b) => a.rank - b.rank);
  return cands.slice(0, limit).map(({ corpus, book, name }) => ({ corpus, book, name }));
}

export const matchBook = (query: string): BookMatch | null => matchBooks(query, 1)[0] ?? null;

const RE = /^(.+?)\s*(\d+)(?:\s*[:.,]\s*(\d+)(?:\s*[-–]\s*(\d+))?)?\s*$/;

export function parseCitation(input: string): CitationRef | null {
  const m = input.trim().match(RE);
  if (!m) return null;
  const bm = matchBook(m[1]);
  if (!bm) return null;
  const chapter = Number(m[2]);
  if (!Number.isInteger(chapter) || chapter < 1) return null;
  const ref: CitationRef = { corpus: bm.corpus, book: bm.book, chapter };
  if (m[3]) {
    const vs = Number(m[3]);
    ref.verseStart = vs;
    ref.verseEnd = Math.max(vs, m[4] ? Number(m[4]) : vs);
  }
  return ref;
}

// Forme réduite d'un id de livre : « gen » -> « Gen », « 1co » -> « 1Co », « jn » -> « Jn ».
export function shortBookLabel(book: string): string {
  const m = book.match(/^(\d*)(.*)$/);
  const num = m?.[1] ?? "";
  const rest = m?.[2] ?? book;
  return num + rest.charAt(0).toUpperCase() + rest.slice(1);
}

export const bookFullName = (corpus: string, book: string): string => corpusById(corpus).bookNames[book] ?? book;

export function chapterRefLabel(corpus: string, book: string, chapter: number, form: "short" | "long"): string {
  return form === "short" ? `${shortBookLabel(book)} ${chapter}` : `${bookFullName(corpus, book)} ${chapter}`;
}

export function verseRefLabel(corpus: string, book: string, chapter: number, vs: number, ve: number): string {
  return `${bookFullName(corpus, book)} ${chapter}, ${ve > vs ? `${vs}-${ve}` : vs}`;
}

export const chapterHref = (corpus: string, book: string, chapter: number): string =>
  `${corpusById(corpus).routePrefix}/${book}/${chapter}`;

export const verseHref = (corpus: string, book: string, chapter: number, verseStart: number): string =>
  `${chapterHref(corpus, book, chapter)}#v${verseStart}`;
