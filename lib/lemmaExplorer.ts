import "server-only";
import { loadDistributionFs, loadLemmasFs } from "./nt-server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { assessGloss, type Gloss } from "../src/data/glosses";
import { ntLemmaFor } from "../src/data/lemmaEquivalences";
import { NT, LXX } from "../src/data/corpus";
import { searchLemmaIndex } from "../src/data/nt";
import { mergeLemmaIndexes, type BibleLemma } from "../src/data/bibleIndex";
import { PAGE_SIZE, type CorpusFilter, type ExplorerQuery, type FreqFilter } from "../src/data/explorerQuery";
import type { CorpusConfig } from "../src/data/corpus";

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

// --- Filtres avancés ---

const foldGreek = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f\u1fbd\u1fbf\u02bc]/g, "").toLowerCase().replace(/ς/g, "σ");
const foldLatin = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const isGreek = (s: string) => /[\u0370-\u03ff\u1f00-\u1fff]/.test(s);

// Motif à jokers : * (n'importe quelle suite), ? (une lettre). Sans joker : contient.
function patternTest(pattern: string): ((e: BibleLemma) => boolean) | null {
  if (!pattern) return null;
  const greek = isGreek(pattern);
  const fold = greek ? foldGreek : foldLatin;
  const body = fold(pattern).replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".");
  const re = new RegExp(/[*?]/.test(pattern) ? `^${body}$` : body);
  return greek ? (e) => re.test(foldGreek(e.lemma)) : (e) => re.test(foldLatin(e.translitR)) || re.test(foldLatin(e.translit));
}

const dataDir = (c: CorpusConfig) => process.env[c.dataDirEnv] || path.join(process.cwd(), "public", c.dataPrefix);

// Livres de chaque lemme (clé = lemme fusionné, comme mergeLemmaIndexes). Chargé
// une fois, à la première recherche par livre.
let books: Promise<Map<string, Record<string, number>>> | null = null;
function bookIndex() {
  books ??= (async () => {
    const out = new Map<string, Record<string, number>>();
    const nt = await loadLemmasFs(NT);
    const ntNames = new Set(nt.map((e) => e.lemma));
    const add = async (c: CorpusConfig, entries: { lemma: string; oid: number }[], key: (l: string) => string) => {
      for (let i = 0; i < entries.length; i += 200) {
        await Promise.all(
          entries.slice(i, i + 200).map(async (e) => {
            const dist = await loadDistributionFs(e.oid, c);
            const k = key(e.lemma);
            out.set(k, { ...(out.get(k) ?? {}), ...dist });
          }),
        );
      }
    };
    await add(NT, nt, (l) => l);
    await add(LXX, await loadLemmasFs(LXX), (l) => (ntNames.has(ntLemmaFor(l)) ? ntLemmaFor(l) : l));
    return out;
  })();
  return books;
}

let glosses: Promise<Record<string, Gloss>[]> | null = null;
function glossSets() {
  glosses ??= Promise.all(
    [NT, LXX].map((c) =>
      readFile(path.join(dataDir(c), "glosses.json"), "utf8")
        .then((t) => JSON.parse(t) as Record<string, Gloss>)
        .catch(() => ({})),
    ),
  );
  return glosses;
}

async function advancedFilter(q: ExplorerQuery): Promise<(e: BibleLemma) => boolean> {
  const tests: ((e: BibleLemma) => boolean)[] = [];
  const pattern = patternTest(q.pattern);
  if (pattern) tests.push(pattern);
  if (q.min !== null) tests.push((e) => countIn(e, q.corpus) >= q.min!);
  if (q.max !== null) tests.push((e) => countIn(e, q.corpus) <= q.max!);
  if (q.presence === "nt-seul") tests.push((e) => e.nt > 0 && e.lxx === 0);
  if (q.presence === "lxx-seul") tests.push((e) => e.lxx > 0 && e.nt === 0);
  if (q.presence === "commun") tests.push((e) => e.nt > 0 && e.lxx > 0);
  if (q.book) {
    const index = await bookIndex();
    const id = q.book;
    tests.push((e) => {
      const n = index.get(e.lemma)?.[id] ?? 0;
      return q.bookMode === "propre" ? n > 0 && n === e.count : n > 0;
    });
  }
  if (q.definition) {
    const sets = await glossSets();
    const has = (e: BibleLemma) => sets.some((g) => assessGloss(e.lemma, g[e.lemma]).gloss !== null);
    tests.push(q.definition === "avec" ? has : (e) => !has(e));
  }
  return (e) => tests.every((t) => t(e));
}

type Facet = "corpus" | "nature" | "freq" | "initial";

// Un lemme passe-t-il tous les filtres, sauf éventuellement celui d'une facette
// (dont on compte alors chaque valeur) ?
function passes(e: BibleLemma, q: ExplorerQuery, except?: Facet): boolean {
  const n = countIn(e, q.corpus);
  if (except !== "corpus" && n === 0) return false;
  if (except !== "nature" && q.nature && e.nature !== q.nature) return false;
  if (except !== "freq" && !inFreq(except === "corpus" ? e.count : n, q.freq)) return false;
  if (except !== "initial" && q.initial && bare(e.lemma)[0] !== q.initial) return false;
  return true;
}

const tally = <K extends string>(items: BibleLemma[], keys: (e: BibleLemma) => K[]) => {
  const out = {} as Record<K, number>;
  for (const e of items) for (const k of keys(e)) out[k] = (out[k] ?? 0) + 1;
  return out;
};

export async function explore(query: ExplorerQuery) {
  const all = await loadIndex();
  const advanced = await advancedFilter(query);
  const pool = (query.q ? (searchLemmaIndex(all, query.q) as BibleLemma[]) : all).filter(advanced);
  const matched = pool.filter((e) => passes(e, query));

  const facets = {
    corpus: tally(pool.filter((e) => passes(e, query, "corpus")), (e) => [
      "all",
      ...(e.nt ? (["nt"] as const) : []),
      ...(e.lxx ? (["lxx"] as const) : []),
    ]),
    nature: tally(pool.filter((e) => passes(e, query, "nature")), (e) => [e.nature]),
    freq: tally(pool.filter((e) => passes(e, query, "freq")), (e) => {
      const n = countIn(e, query.corpus);
      return (["hapax", "rare", "common", "frequent"] as FreqFilter[]).filter((f) => inFreq(n, f));
    }),
    initial: tally(pool.filter((e) => passes(e, query, "initial")), (e) => [bare(e.lemma)[0]]),
  };

  const sorted =
    query.sort === "alpha"
      ? [...matched].sort((a, b) => collator.compare(a.lemma, b.lemma))
      : query.sort === "freq"
        ? [...matched].sort((a, b) => countIn(b, query.corpus) - countIn(a, query.corpus))
        : query.sort === "nt"
          ? [...matched].sort((a, b) => b.nt - a.nt)
          : query.sort === "lxx"
            ? [...matched].sort((a, b) => b.lxx - a.lxx)
            : query.sort === "length"
              ? [...matched].sort((a, b) => foldGreek(b.lemma).length - foldGreek(a.lemma).length)
              : matched;

  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const page = Math.min(query.page, pages);
  return {
    rows: sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    total: sorted.length,
    page,
    pages,
    facets,
    natures: Object.entries(facets.nature)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    lemmas: all.length,
  };
}
