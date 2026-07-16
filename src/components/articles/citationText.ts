import { corpusById } from "@/src/data/corpus";
import type { VerseLine } from "./citationTypes";

// Résolution client du texte d'une citation, pour l'aperçu du picker et le rendu des
// blocs dans l'éditeur. Lit les JSON publics déjà servis (corpus + fr.json), sans
// nouvel endpoint. Le rendu public, lui, résout côté serveur via loadChapterFs.

export type VerseData = { greek: string; french: string | null };

const chapterCache = new Map<string, Promise<Record<number, VerseData>>>();
const booksCache = new Map<string, Promise<Record<string, number>>>();

export function loadChapterVerses(corpus: string, book: string, chapter: number): Promise<Record<number, VerseData>> {
  const c = corpusById(corpus);
  const key = `${c.dataPrefix}/${book}/${chapter}`;
  const hit = chapterCache.get(key);
  if (hit) return hit;
  const p = (async () => {
    const [chapRes, frRes] = await Promise.all([
      fetch(`/${c.dataPrefix}/${book}/${chapter}.json`),
      fetch(`/${c.dataPrefix}/${book}/fr.json`).catch(() => null),
    ]);
    if (!chapRes.ok) throw new Error("Chapitre introuvable");
    const data = (await chapRes.json()) as { mots?: { grec: string; verse: number | null }[] };
    const fr = frRes && frRes.ok ? await frRes.json() : null;
    const greekByV: Record<number, string[]> = {};
    for (const m of data.mots ?? []) {
      if (m.verse == null) continue;
      (greekByV[m.verse] ??= []).push(m.grec);
    }
    const frCh: Record<string, string> = fr?.[String(chapter)] ?? {};
    const out: Record<number, VerseData> = {};
    for (const v of Object.keys(greekByV)) {
      const n = Number(v);
      out[n] = { greek: greekByV[n].join(" "), french: frCh[v] ?? null };
    }
    return out;
  })();
  chapterCache.set(key, p);
  return p;
}

export function loadBookChapters(corpus: string): Promise<Record<string, number>> {
  const c = corpusById(corpus);
  const hit = booksCache.get(c.id);
  if (hit) return hit;
  const p = fetch(`/${c.dataPrefix}/books.json`)
    .then((r) => r.json())
    .then((d: { books: { id: string; chapters: number }[] }) => {
      const out: Record<string, number> = {};
      for (const b of d.books) out[b.id] = b.chapters;
      return out;
    });
  booksCache.set(c.id, p);
  return p;
}

export function sliceVerses(byVerse: Record<number, VerseData>, vs: number, ve: number): VerseLine[] {
  const out: VerseLine[] = [];
  for (let v = vs; v <= ve; v += 1) if (byVerse[v]) out.push({ v, greek: byVerse[v].greek, french: byVerse[v].french });
  return out;
}
