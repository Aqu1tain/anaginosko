import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { bookById, chapterNumbers, type Distribution } from "../src/data/nt";
import type { CorpusConfig } from "../src/data/corpus";
import { loadBooksFs } from "./nt-server";

// Concordance en contexte (KWIC) : chaque occurrence avec les mots qui l'entourent
// dans son verset, lue dans les chapitres et paginée dans l'ordre du canon.

export type KwicLine = { b: string; c: number; v: number; w: number; left: string; form: string; right: string; cutLeft: boolean; cutRight: boolean };
export type KwicPage = { lines: KwicLine[]; total: number; next: number | null };

type Mot = { grec: string; lemme: string | null; verse: number | null };

const WINDOW = 6;
const CACHE_MAX = 600;
const chapters = new Map<string, Mot[]>();

async function mots(book: string, chapter: number, c: CorpusConfig): Promise<Mot[]> {
  const key = `${c.id}/${book}/${chapter}`;
  const hit = chapters.get(key);
  if (hit) return hit;
  const dir = process.env[c.dataDirEnv] || path.join(process.cwd(), "public", c.dataPrefix);
  const { mots } = JSON.parse(await readFile(path.join(dir, book, `${chapter}.json`), "utf8")) as { mots: Mot[] };
  if (chapters.size >= CACHE_MAX) chapters.delete(chapters.keys().next().value!);
  chapters.set(key, mots);
  return mots;
}

function line(list: Mot[], i: number, b: string, c: number): KwicLine {
  const verse = list[i].verse;
  const inVerse = (j: number) => j >= 0 && j < list.length && list[j].verse === verse;
  let from = i;
  while (inVerse(from - 1) && i - from < WINDOW) from--;
  let to = i;
  while (inVerse(to + 1) && to - i < WINDOW) to++;
  return {
    b,
    c,
    v: verse ?? 0,
    w: i * 2,
    left: list.slice(from, i).map((m) => m.grec).join(" "),
    form: list[i].grec,
    right: list.slice(i + 1, to + 1).map((m) => m.grec).join(" "),
    cutLeft: inVerse(from - 1),
    cutRight: inVerse(to + 1),
  };
}

export async function kwic(
  lemma: string,
  c: CorpusConfig,
  dist: Distribution,
  { book, offset = 0, limit = 30 }: { book?: string | null; offset?: number; limit?: number },
): Promise<KwicPage> {
  const ids = (book ? [book] : [...c.bookOrder]).filter((id) => (dist[id] ?? 0) > 0);
  const total = ids.reduce((n, id) => n + dist[id], 0);
  const books = await loadBooksFs(c);
  const lines: KwicLine[] = [];
  let skip = offset;

  for (const id of ids) {
    if (skip >= dist[id]) {
      skip -= dist[id];
      continue;
    }
    const meta = bookById(books, id);
    if (!meta) continue;
    for (const ch of chapterNumbers(meta)) {
      const list = await mots(id, ch, c);
      for (let i = 0; i < list.length && lines.length < limit; i++) {
        if (list[i].lemme !== lemma) continue;
        if (skip > 0) skip--;
        else lines.push(line(list, i, id, ch));
      }
      if (lines.length >= limit) break;
    }
    if (lines.length >= limit) break;
  }
  const reached = offset + lines.length;
  return { lines, total, next: reached < total && lines.length === limit ? reached : null };
}
