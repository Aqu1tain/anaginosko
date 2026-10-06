import "server-only";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { loadBooksFs, loadLemmasFs } from "./nt-server";
import { NT, LXX, type CorpusConfig } from "../src/data/corpus";
import { chapterNumbers } from "../src/data/nt";

// Chiffres du site, calculés sur les données servies : /a-propos, /llms.txt et
// l'accueil citent les mêmes valeurs.
export type CorpusFacts = { books: number; chapters: number; lemmas: number; words: number };
export type SiteFacts = { nt: CorpusFacts; lxx: CorpusFacts; lemmas: number; baillyNotices: number };

async function corpusFacts(corpus: CorpusConfig): Promise<CorpusFacts> {
  const [books, lemmas] = await Promise.all([loadBooksFs(corpus), loadLemmasFs(corpus)]);
  return {
    books: books.length,
    chapters: books.reduce((n, b) => n + chapterNumbers(b).length, 0),
    lemmas: lemmas.length,
    words: lemmas.reduce((n, e) => n + e.count, 0),
  };
}

export async function loadSiteFacts(): Promise<SiteFacts> {
  const [nt, lxx, ntLemmas, lxxLemmas, notices] = await Promise.all([
    corpusFacts(NT),
    corpusFacts(LXX),
    loadLemmasFs(NT),
    loadLemmasFs(LXX),
    readdir(path.join(process.cwd(), "public", "bailly")).catch(() => []),
  ]);
  const lemmas = new Set([...ntLemmas, ...lxxLemmas].map((e) => e.lemma)).size;
  return { nt, lxx, lemmas, baillyNotices: notices.filter((f) => f.endsWith(".json")).length };
}

export const fr = (n: number) => n.toLocaleString("fr-FR");
