"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { loadLemmaIndex, searchLemmaIndex, type LemmaEntry } from "../data/nt";
import { NT, LXX, type CorpusConfig } from "../data/corpus";
import { concordanceCorpus, isBible, lemmaConcordanceBase, mergeLemmaIndexes, type BibleLemma } from "../data/bibleIndex";

function Loading() {
  return (
    <div className="flex justify-center py-20">
      <span className="loading loading-spinner loading-lg text-primary" />
    </div>
  );
}

function useLemmaIndex(corpus: CorpusConfig) {
  const [index, setIndex] = useState<LemmaEntry[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let alive = true;
    const load = isBible(corpus)
      ? Promise.all([loadLemmaIndex(NT), loadLemmaIndex(LXX)]).then(([nt, lxx]) => mergeLemmaIndexes(nt, lxx))
      : loadLemmaIndex(corpus);
    load
      .then((i) => alive && setIndex(i))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [corpus]);
  return { index, error };
}

function LemmaRow({ entry, corpus }: { entry: LemmaEntry; corpus: CorpusConfig }) {
  const bible = isBible(corpus) ? (entry as BibleLemma) : null;
  const base = bible ? lemmaConcordanceBase(bible) : corpus.concordanceBase;
  return (
    <li>
      <Link
        href={`${base}/${encodeURIComponent(entry.lemma)}`}
        className="flex items-baseline gap-3 rounded-md px-2 py-2 transition-colors hover:bg-base-200/70"
      >
        <span lang="grc" className="font-greek text-xl">
          {entry.lemma}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm text-base-content/55">
          {entry.translitR}
          <span className="hidden sm:inline"> · {entry.nature.toLowerCase()}</span>
        </span>
        <span className="shrink-0 text-xs tabular-nums text-base-content/55">
          {bible ? [bible.nt && `NT ${bible.nt}`, bible.lxx && `LXX ${bible.lxx}`].filter(Boolean).join(" · ") : entry.count}
        </span>
      </Link>
    </li>
  );
}

// Sans recherche : les mots pleins les plus fréquents (les mots-outils n'apprennent rien).
const CONTENT = new Set(["Nom", "Verbe", "Adjectif"]);
const LIMIT = 200;

function List({ index, corpus }: { index: LemmaEntry[]; corpus: CorpusConfig }) {
  const [query, setQuery] = useState("");
  const searching = query.trim().length > 0;
  const results = useMemo(
    () =>
      searching
        ? searchLemmaIndex(index, query)
        : index.filter((e) => CONTENT.has(e.nature)).sort((a, b) => b.count - a.count),
    [index, query, searching],
  );
  // Amorce la recherche depuis ?q= (cible du SearchAction / sitelinks search box).
  // Via window plutôt que useSearchParams pour ne pas forcer le rendu client de
  // toute la page statique.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) setQuery(q);
  }, []);

  return (
    <div className="max-w-3xl pb-4">
      <h1 className="text-3xl font-bold">Concordance</h1>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="λόγος, logos, arkhi…"
        aria-label="Chercher un mot grec"
        className="input input-bordered input-lg mt-5 w-full font-greek"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
      />
      <p className="mt-2 text-xs text-base-content/50">
        {index.length.toLocaleString("fr-FR")} lemmes {corpus.genitive}, en grec ou en translittération.
      </p>

      <h2 className="mt-8 mb-2 text-sm font-semibold text-base-content/70">
        {searching ? `${results.length} résultat${results.length > 1 ? "s" : ""}` : "Les plus fréquents"}
      </h2>
      {results.length === 0 ? (
        <p className="rounded-box bg-base-200 px-4 py-6 text-center text-sm text-base-content/70">Aucun résultat.</p>
      ) : (
        <ol className="grid divide-y divide-base-300/70 sm:grid-cols-2 sm:gap-x-6 sm:divide-y-0">
          {results.slice(0, LIMIT).map((e) => (
            <LemmaRow key={e.lemma} entry={e} corpus={corpus} />
          ))}
        </ol>
      )}
      {searching && results.length > LIMIT && (
        <p className="mt-3 text-sm text-base-content/55">Affinez la recherche pour voir les {results.length - LIMIT} autres.</p>
      )}
    </div>
  );
}

// Liste / recherche de la concordance. La fiche d'un lemme est rendue côté
// serveur (cf. app/concordance/[lemma]/page.tsx + LemmaDetail) pour être indexable.
export default function ConcordanceView({ corpusId }: { corpusId: string }) {
  const corpus = concordanceCorpus(corpusId);
  const { index, error } = useLemmaIndex(corpus);
  if (error) return <p className="py-20 text-center text-base-content/70">Chargement impossible.</p>;
  if (!index) return <Loading />;
  return <List index={index} corpus={corpus} />;
}
