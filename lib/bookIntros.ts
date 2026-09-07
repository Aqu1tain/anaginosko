import "server-only";
import fs from "node:fs";
import path from "node:path";
import { saveImageUpload } from "./articles";
import { corpusById } from "../src/data/corpus";

// Introduction éditoriale d'un livre biblique : un fichier JSON par livre, stocké
// côté Next (comme les articles et profils). Rédigée dans l'éditeur BlockNote, rendue
// serveur (indexable) au-dessus de la grille de chapitres. Clé = {corpus}-{book}.

export type BookIntro = {
  corpus: string; // "nt" | "lxx"
  book: string; // "jn", "gen"…
  content: unknown[]; // blocs BlockNote
  published: boolean;
  excerpt: string; // dérivé du contenu, pour la description SEO
  updatedAt: string;
  updatedBy: string; // nom de l'éditeur
};

export type BookIntroPatch = { content?: unknown[]; published?: boolean };

const MAX_CONTENT_BYTES = 1_000_000;

const ARTICLES_DIR = process.env.ARTICLES_DIR || path.join(process.cwd(), ".articles");
const INTROS_SUB = path.join(ARTICLES_DIR, "book-intros");
const now = () => new Date().toISOString();

const KEY_RE = /^[a-z0-9-]+$/i;
const introKey = (corpus: string, book: string) => `${corpus}-${book}`;
const introPath = (corpus: string, book: string) => path.join(INTROS_SUB, `${introKey(corpus, book)}.json`);

// Le corpus doit être connu et le livre exister dans son registre canonique.
const validRef = (corpus: string, book: string): boolean =>
  (corpus === "nt" || corpus === "lxx") && KEY_RE.test(book) && !!corpusById(corpus).bookNames[book];

function readIntro(corpus: string, book: string): BookIntro | null {
  if (!validRef(corpus, book)) return null;
  try {
    return JSON.parse(fs.readFileSync(introPath(corpus, book), "utf8")) as BookIntro;
  } catch {
    return null;
  }
}

function writeIntro(i: BookIntro) {
  fs.mkdirSync(INTROS_SUB, { recursive: true });
  const target = introPath(i.corpus, i.book);
  const tmp = target + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(i, null, 2));
  fs.renameSync(tmp, target);
}

function readAll(): BookIntro[] {
  try {
    return fs
      .readdirSync(INTROS_SUB)
      .filter((f) => f.endsWith(".json") && !f.endsWith(".tmp"))
      .map((f) => {
        try {
          return JSON.parse(fs.readFileSync(path.join(INTROS_SUB, f), "utf8")) as BookIntro;
        } catch {
          return null;
        }
      })
      .filter((i): i is BookIntro => i !== null);
  } catch {
    return [];
  }
}

// Rendu public : uniquement l'intro publiée d'un livre.
export function getPublishedIntro(corpus: string, book: string): BookIntro | null {
  const i = readIntro(corpus, book);
  return i && i.published ? i : null;
}

// Admin : l'intro complète (brouillon ou publiée) pour l'édition.
export const getBookIntro = (corpus: string, book: string): BookIntro | null => readIntro(corpus, book);

export const listBookIntros = (): BookIntro[] => readAll();

// Indice serveur pour l'aperçu replié : une intro courte s'affiche entière sans
// bouton, sans attendre la mesure côté client (évite le clignotement du fondu).
export function bookIntroIsLong(content: unknown[]): boolean {
  let chars = 0;
  let blocks = 0;
  const walk = (list: unknown[]) => {
    for (const block of list) {
      const b = block as { type?: string; content?: unknown; children?: unknown[] };
      blocks += 1;
      if (b.type === "image" || b.type === "table" || b.type === "embed" || b.type === "verseQuote") chars += 400;
      if (Array.isArray(b.content)) {
        for (const it of b.content) if (it && typeof it === "object" && "text" in it) chars += String((it as { text: unknown }).text ?? "").length;
      }
      if (Array.isArray(b.children)) walk(b.children);
    }
  };
  walk(Array.isArray(content) ? content : []);
  return chars > 450 || blocks > 5;
}

// Extrait SEO : concatène le texte des premiers blocs de prose (≤ ~300 caractères).
export function bookIntroExcerpt(content: unknown[]): string {
  const flatten = (inline: unknown): string =>
    Array.isArray(inline)
      ? inline.map((it) => (it && typeof it === "object" && "text" in it ? String((it as { text: unknown }).text ?? "") : "")).join("")
      : "";
  const parts: string[] = [];
  for (const block of Array.isArray(content) ? content : []) {
    const b = block as { type?: string; content?: unknown };
    if (b.type !== "paragraph" && b.type !== "heading") continue;
    const text = flatten(b.content).trim();
    if (text) parts.push(text);
    if (parts.join(" ").length > 260) break;
  }
  const joined = parts.join(" ").replace(/\s+/g, " ").trim();
  return joined.length > 300 ? joined.slice(0, 297).trimEnd() + "…" : joined;
}

export function saveBookIntro(
  corpus: string,
  book: string,
  patch: BookIntroPatch,
  auth: { name?: string },
): { ok: true; intro: BookIntro } | { ok: false; status: number; error: string } {
  if (!validRef(corpus, book)) return { ok: false, status: 400, error: "Référence de livre invalide." };
  const current: BookIntro =
    readIntro(corpus, book) ?? { corpus, book, content: [], published: false, excerpt: "", updatedAt: now(), updatedBy: "" };
  const next: BookIntro = { ...current, updatedAt: now(), updatedBy: auth.name || current.updatedBy };

  if (patch.content !== undefined) {
    if (!Array.isArray(patch.content)) return { ok: false, status: 400, error: "Contenu invalide." };
    if (JSON.stringify(patch.content).length > MAX_CONTENT_BYTES)
      return { ok: false, status: 413, error: "Contenu trop volumineux." };
    next.content = patch.content;
    next.excerpt = bookIntroExcerpt(patch.content);
  }
  if (patch.published !== undefined) next.published = !!patch.published;

  writeIntro(next);
  return { ok: true, intro: next };
}

// Upload d'image d'intro : réutilise le stock d'uploads partagé (servi par la route
// /articles/uploads/[id]/[file]) sous un sous-dossier propre au livre.
export function saveIntroImage(
  corpus: string,
  book: string,
  buf: Buffer,
): { ok: true; url: string } | { ok: false; status: number; error: string } {
  if (!validRef(corpus, book)) return { ok: false, status: 400, error: "Référence de livre invalide." };
  return saveImageUpload(`book-${corpus}-${book}`, buf);
}
