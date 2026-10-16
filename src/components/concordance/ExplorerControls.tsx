"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  FREQ_FILTERS,
  INITIALS,
  SORTS,
  queryString,
  type CorpusFilter,
  type ExplorerQuery,
} from "../../data/explorerQuery";

const CORPUS_LABEL: Record<CorpusFilter, string> = { all: "Tout", nt: "NT", lxx: "LXX" };
const select = "select select-bordered select-sm w-full sm:w-auto";

// Recherche et filtres : chaque changement réécrit l'URL, la page serveur suit.
export default function ExplorerControls({
  query,
  natures,
  defaultCorpus,
}: {
  query: ExplorerQuery;
  natures: { name: string; count: number }[];
  defaultCorpus: CorpusFilter;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const [q, setQ] = useState(query.q);
  const first = useRef(true);

  const go = (patch: Partial<ExplorerQuery>) =>
    start(() => router.replace(`${pathname}${queryString(query, { ...patch, page: 1 }, defaultCorpus)}`, { scroll: false }));

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => go({ q: q.trim(), sort: q.trim() ? "relevance" : "freq" }), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="space-y-3" aria-busy={pending}>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="λόγος, logos, arkhi…"
        aria-label="Chercher un mot grec"
        className="input input-bordered input-lg w-full font-greek"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
      />
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center wide:hidden">
        <div className="col-span-2 flex w-fit gap-1 rounded-full bg-base-200 p-1 text-sm" role="group" aria-label="Corpus">
          {(Object.keys(CORPUS_LABEL) as CorpusFilter[]).map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={query.corpus === c}
              onClick={() => go({ corpus: c })}
              className={`rounded-full px-3 py-1 font-medium transition-colors ${query.corpus === c ? "bg-base-100 shadow-sm" : "text-base-content/60 hover:text-base-content"}`}
            >
              {CORPUS_LABEL[c]}
            </button>
          ))}
        </div>
        <select aria-label="Nature" className={select} value={query.nature ?? ""} onChange={(e) => go({ nature: e.target.value || null })}>
          <option value="">Toutes natures</option>
          {natures.map((n) => (
            <option key={n.name} value={n.name}>
              {n.name} ({n.count.toLocaleString("fr-FR")})
            </option>
          ))}
        </select>
        <select aria-label="Fréquence" className={select} value={query.freq} onChange={(e) => go({ freq: e.target.value as ExplorerQuery["freq"] })}>
          {Object.entries(FREQ_FILTERS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
        <select aria-label="Initiale" className={`${select} font-greek`} value={query.initial ?? ""} onChange={(e) => go({ initial: e.target.value || null })}>
          <option value="">Α à Ω</option>
          {INITIALS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <select aria-label="Tri" className={select} value={query.sort} onChange={(e) => go({ sort: e.target.value as ExplorerQuery["sort"] })}>
          {Object.entries(SORTS)
            .filter(([k]) => k !== "relevance" || query.q)
            .map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
        </select>
      </div>
    </div>
  );
}
