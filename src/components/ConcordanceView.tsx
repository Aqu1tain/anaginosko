"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { loadLemmaIndex, searchLemmaIndex, type LemmaEntry } from "../data/nt";

function Loading() {
  return (
    <div className="flex justify-center py-20">
      <span className="loading loading-spinner loading-lg text-primary" />
    </div>
  );
}

function useLemmaIndex() {
  const [index, setIndex] = useState<LemmaEntry[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let alive = true;
    loadLemmaIndex()
      .then((i) => alive && setIndex(i))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, []);
  return { index, error };
}

function LemmaRow({ entry }: { entry: LemmaEntry }) {
  return (
    <Link
      href={`/concordance/${encodeURIComponent(entry.lemma)}`}
      className="flex items-center gap-3 rounded-box border border-base-300 bg-base-100 px-3.5 py-2.5 transition-colors hover:border-primary/40"
    >
      <span className="min-w-0 flex-1">
        <span className="font-greek text-xl">{entry.lemma}</span>
        <span className="ml-2 text-sm text-base-content/70">{entry.translitR}</span>
        <span className="ml-1.5 text-xs text-base-content/70">· {entry.translit}</span>
      </span>
      <span className="shrink-0 text-xs text-base-content/70">{entry.nature}</span>
      <span className="badge badge-sm badge-ghost shrink-0">{entry.count}</span>
    </Link>
  );
}

const EXAMPLE_LEMMAS = ["λόγος", "ἀγάπη", "θεός", "πίστις", "χάρις", "πνεῦμα"];

function List({ index }: { index: LemmaEntry[] }) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchLemmaIndex(index, query), [index, query]);
  const examples = useMemo(() => {
    const byLemma = new Map(index.map((e) => [e.lemma, e]));
    return EXAMPLE_LEMMAS.map((l) => byLemma.get(l)).filter((e): e is LemmaEntry => !!e);
  }, [index]);

  return (
    <div className="pb-4">
      <p className="max-w-prose pt-6 text-[0.95rem] leading-relaxed text-base-content/75">
        Concordance des {index.length} lemmes du Nouveau Testament. Cherchez en grec
        (<span className="font-greek">λόγος</span>) ou en translittération latine, restituée
        comme érasmienne (ex.&nbsp;<span className="font-greek">ἀρχή</span> : <em>arkhi</em> ou{" "}
        <em>arkê</em>).
      </p>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Chercher : λόγος, arkhi, logos…"
        className="input input-bordered mt-4 w-full"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
      />
      {!query && examples.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-base-content/70">
            Exemples
          </span>
          {examples.map((e) => (
            <Link
              key={e.lemma}
              href={`/concordance/${encodeURIComponent(e.lemma)}`}
              className="badge badge-lg badge-ghost gap-1.5 font-greek hover:badge-primary"
            >
              {e.lemma}
              <span className="text-[0.65rem] text-base-content/70">{e.count}</span>
            </Link>
          ))}
        </div>
      )}
      <p className="mt-3 mb-2 text-sm text-base-content/70">
        {results.length} résultat{results.length > 1 ? "s" : ""}
      </p>
      {results.length === 0 ? (
        <div className="rounded-box bg-base-200 px-4 py-6 text-center text-sm text-base-content/70">
          Aucun résultat. Essaie en grec ou en translittération latine.
        </div>
      ) : (
        <div className="grid gap-1.5">
          {results.slice(0, 300).map((e) => (
            <LemmaRow key={e.lemma} entry={e} />
          ))}
        </div>
      )}
      {results.length > 300 && (
        <p className="mt-3 text-center text-sm text-base-content/70">
          Affinez la recherche pour voir les {results.length - 300} autres.
        </p>
      )}
    </div>
  );
}

// Liste / recherche de la concordance. La fiche d'un lemme est rendue côté
// serveur (cf. app/concordance/[lemma]/page.tsx + LemmaDetail) pour être indexable.
export default function ConcordanceView() {
  const { index, error } = useLemmaIndex();
  if (error) return <p className="py-20 text-center text-base-content/70">Chargement impossible.</p>;
  if (!index) return <Loading />;
  return <List index={index} />;
}
