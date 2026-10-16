import "server-only";
import { loadLemmasFs } from "./nt-server";
import { NT, LXX } from "../src/data/corpus";
import { searchLemmaIndex } from "../src/data/nt";
import { mergeLemmaIndexes, type BibleLemma } from "../src/data/bibleIndex";
import { PAGE_SIZE, type CorpusFilter, type ExplorerQuery, type FreqFilter } from "../src/data/explorerQuery";

// Explorateur de la concordance : 15 000 lemmes filtrés, triés et paginés côté
// serveur, l'état entier dans l'URL (liens partageables et explorables).

export const countIn = (e: BibleLemma, corpus: CorpusFilter) => (corpus === "nt" ? e.nt : corpus === "lxx" ? e.lxx : e.count);

const bare = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
const inFreq = (n: number, f: FreqFilter) =>
  f === "hapax" ? n === 1 : f === "rare" ? n >= 2 && n <= 9 : f === "common" ? n >= 10 && n <= 99 : f === "frequent" ? n >= 100 : true;
const collator = new Intl.Collator("el");

let index: BibleLemma[] | null = null;
async function loadIndex() {
  index ??= mergeLemmaIndexes(await loadLemmasFs(NT), await loadLemmasFs(LXX));
  return index;
}

export async function explore(query: ExplorerQuery) {
  const all = await loadIndex();
  const base = (query.q ? (searchLemmaIndex(all, query.q) as BibleLemma[]) : all).filter((e) => {
    const n = countIn(e, query.corpus);
    return n > 0 && inFreq(n, query.freq) && (!query.initial || bare(e.lemma)[0] === query.initial);
  });

  const natureCounts = new Map<string, number>();
  for (const e of base) natureCounts.set(e.nature, (natureCounts.get(e.nature) ?? 0) + 1);
  const natures = [...natureCounts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

  const filtered = query.nature ? base.filter((e) => e.nature === query.nature) : base;
  const sorted =
    query.sort === "alpha"
      ? [...filtered].sort((a, b) => collator.compare(a.lemma, b.lemma))
      : query.sort === "freq"
        ? [...filtered].sort((a, b) => countIn(b, query.corpus) - countIn(a, query.corpus))
        : filtered;

  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const page = Math.min(query.page, pages);
  return {
    rows: sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    total: sorted.length,
    page,
    pages,
    natures,
    lemmas: all.length,
  };
}
