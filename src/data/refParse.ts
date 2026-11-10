import { CORPORA, chapterTitle, corpusById, type ChapterId } from "./corpus";
import { estherTarget, isEstherAddition, rahlfsLabel } from "../../lib/esther-additions.mjs";

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

export function chapterRefLabel(corpus: string, book: string, chapter: ChapterId, form: "short" | "long"): string {
  if (form === "short") return `${shortBookLabel(book)} ${chapter}`;
  return typeof chapter === "string" ? chapterTitle(bookFullName(corpus, book), chapter) : `${bookFullName(corpus, book)} ${chapter}`;
}

const rahlfsCitation = (chapter: ChapterId, v: number) => rahlfsLabel(chapter, v)?.replace(":", ", ") ?? String(v);

// Une addition d'Esther se cite dans la numérotation de Rahlfs : « Esther 4, 17k (addition C) ».
export function verseRefLabel(corpus: string, book: string, chapter: ChapterId, vs: number, ve: number): string {
  const name = bookFullName(corpus, book);
  if (!isEstherAddition(book, chapter)) return `${name} ${chapter}, ${ve > vs ? `${vs}-${ve}` : vs}`;
  const verses = ve > vs ? `${rahlfsCitation(chapter, vs)} – ${rahlfsCitation(chapter, ve)}` : rahlfsCitation(chapter, vs);
  return `${name} ${verses} (addition ${chapter})`;
}

export type Place = { chapter: ChapterId; verse: number | null };

// Esther : un verset que Rahlfs range dans une addition (« 5:1 », « 4:17k ») mène à
// son chapitre-lettre.
export const estherPlace = (chapter: ChapterId, verse: number | null, sub = ""): Place =>
  (verse !== null && estherTarget(`${chapter}:${verse}${sub}`)) || { chapter, verse };

const ESTHER_LETTER = /^(.+?)\s+([A-F])(?:\s*[:.,]?\s*(\d+))?$/;
const ESTHER_SUB = /^(.+?)\s*(\d+)\s*[:.,]\s*(\d+)([a-z])$/;

// « Est C », « Est C 3 », « Est 4,17k » : le texte du livre et la place visée, à
// condition que l'appelant vérifie que le livre est bien Esther.
export function parseEstherAddition(input: string): ({ bookQuery: string } & Place) | null {
  const letter = input.match(ESTHER_LETTER);
  if (letter) return { bookQuery: letter[1], chapter: letter[2], verse: letter[3] ? Number(letter[3]) : null };
  const sub = input.match(ESTHER_SUB);
  const target = sub && estherTarget(`${sub[2]}:${sub[3]}${sub[4]}`);
  return sub && target ? { bookQuery: sub[1], ...target } : null;
}

export const chapterHref = (corpus: string, book: string, chapter: ChapterId): string =>
  `${corpusById(corpus).routePrefix}/${book}/${chapter}`;

export const verseHref = (corpus: string, book: string, chapter: ChapterId, verseStart: number): string =>
  `${chapterHref(corpus, book, chapter)}#v${verseStart}`;
