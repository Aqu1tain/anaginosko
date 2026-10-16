"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  BOOK_MODES,
  DEFINITIONS,
  PRESENCES,
  SORTS,
  hasAdvanced,
  queryString,
  type BookMode,
  type CorpusFilter,
  type Definition,
  type ExplorerQuery,
  type Presence,
  type Sort,
} from "../../data/explorerQuery";

export type BookOption = { id: string; name: string; group: string };

const field = "input input-bordered input-sm w-full";
const select = "select select-bordered select-sm w-full";
const label = "mb-1 block text-xs font-medium text-base-content/60";
const toCount = (v: string) => (v.trim() === "" ? null : Math.max(0, Math.floor(Number(v))) || 0);

// Filtres pour chercheurs : motif à jokers, plage d'occurrences, présence par
// corpus, livre (présent dans / propre à), notice. Appliqués d'un coup.
export default function AdvancedFilters({
  query,
  books,
  defaultCorpus,
}: {
  query: ExplorerQuery;
  books: BookOption[];
  defaultCorpus: CorpusFilter;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const [d, setD] = useState({
    pattern: query.pattern,
    min: query.min?.toString() ?? "",
    max: query.max?.toString() ?? "",
    presence: query.presence ?? "",
    book: query.book ?? "",
    bookMode: query.bookMode,
    definition: query.definition ?? "",
    sort: query.sort,
  });
  const set = (patch: Partial<typeof d>) => setD((x) => ({ ...x, ...patch }));

  const apply = (e: React.FormEvent) => {
    e.preventDefault();
    const patch: Partial<ExplorerQuery> = {
      pattern: d.pattern.trim(),
      min: toCount(d.min),
      max: toCount(d.max),
      presence: (d.presence || null) as Presence | null,
      book: d.book || null,
      bookMode: d.bookMode,
      definition: (d.definition || null) as Definition | null,
      sort: d.sort,
      page: 1,
    };
    start(() => router.push(`${pathname}${queryString(query, patch, defaultCorpus)}`, { scroll: false }));
  };

  const groups = [...new Set(books.map((b) => b.group))];

  return (
    <details className="group rounded-box border border-base-300" open={hasAdvanced(query)}>
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5 text-sm font-medium">
        Filtres avancés
        <span className="text-base-content/40 transition-transform group-open:rotate-180" aria-hidden="true">
          ▾
        </span>
      </summary>
      <form onSubmit={apply} className="grid gap-4 border-t border-base-300 p-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy={pending}>
        <label className="sm:col-span-2 lg:col-span-1">
          <span className={label}>Motif</span>
          <input className={`${field} font-greek`} value={d.pattern} onChange={(e) => set({ pattern: e.target.value })} placeholder="*εύω, ἀπο*, *logos" />
          <span className="mt-1 block text-[0.7rem] text-base-content/45">* : n’importe quelle suite · ? : une lettre</span>
        </label>
        <div>
          <span className={label}>Occurrences</span>
          <div className="flex items-center gap-2">
            <input type="number" min={0} inputMode="numeric" aria-label="Minimum" placeholder="min" className={field} value={d.min} onChange={(e) => set({ min: e.target.value })} />
            <span className="text-base-content/40">à</span>
            <input type="number" min={0} inputMode="numeric" aria-label="Maximum" placeholder="max" className={field} value={d.max} onChange={(e) => set({ max: e.target.value })} />
          </div>
        </div>
        <label>
          <span className={label}>Présence</span>
          <select className={select} value={d.presence} onChange={(e) => set({ presence: e.target.value })}>
            <option value="">NT ou Septante</option>
            {Object.entries(PRESENCES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <div className="sm:col-span-2">
          <span className={label}>Livre</span>
          <div className="flex gap-2">
            <select aria-label="Mode" className="select select-bordered select-sm w-32 shrink-0" value={d.bookMode} onChange={(e) => set({ bookMode: e.target.value as BookMode })}>
              {Object.entries(BOOK_MODES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <select aria-label="Livre" className="select select-bordered select-sm min-w-0 flex-1" value={d.book} onChange={(e) => set({ book: e.target.value })}>
              <option value="">Tous les livres</option>
              {groups.map((g) => (
                <optgroup key={g} label={g}>
                  {books
                    .filter((b) => b.group === g)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </div>
        </div>
        <label>
          <span className={label}>Notice</span>
          <select className={select} value={d.definition} onChange={(e) => set({ definition: e.target.value })}>
            <option value="">Indifférent</option>
            {Object.entries(DEFINITIONS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={label}>Tri</span>
          <select className={select} value={d.sort} onChange={(e) => set({ sort: e.target.value as Sort })}>
            {Object.entries(SORTS)
              .filter(([k]) => k !== "relevance" || query.q)
              .map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
          </select>
        </label>
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-1 lg:justify-end">
          <button className="btn btn-primary btn-sm" disabled={pending}>
            {pending ? "…" : "Appliquer"}
          </button>
        </div>
      </form>
    </details>
  );
}
