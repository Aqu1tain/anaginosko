import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/app/_components/Breadcrumb";
import ExplorerControls from "@/src/components/concordance/ExplorerControls";
import AdvancedFilters, { type BookOption } from "@/src/components/concordance/AdvancedFilters";
import { loadBooksFs } from "@/lib/nt-server";
import { explore } from "@/lib/lemmaExplorer";
import {
  BOOK_MODES,
  CORPUS_FILTERS,
  DEFINITIONS,
  FREQ_FILTERS,
  INITIALS,
  PAGE_SIZE,
  PRESENCES,
  SORTS,
  hasAdvanced,
  parseQuery,
  queryString,
  type CorpusFilter,
  type ExplorerQuery,
} from "@/src/data/explorerQuery";
import { LXX, NT } from "@/src/data/corpus";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// Vue filtrée ou recherche : explorable par les liens, mais seule la liste par
// défaut (et ses pages) est indexée.
export async function explorerMetadata(searchParams: SearchParams, defaultCorpus: CorpusFilter, base: Metadata): Promise<Metadata> {
  const query = parseQuery(await searchParams, defaultCorpus);
  const filtered = !!(query.q || query.nature || query.initial || query.freq !== "all" || query.corpus !== defaultCorpus || query.sort !== "freq" || hasAdvanced(query));
  const path = String(base.alternates?.canonical ?? "");
  return {
    ...base,
    alternates: { canonical: `${path}${query.page > 1 ? `?page=${query.page}` : ""}` },
    ...(filtered ? { robots: { index: false, follow: true } } : {}),
  };
}

function pageList(page: number, pages: number): (number | null)[] {
  const keep = new Set([1, pages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pages));
  const out: (number | null)[] = [];
  [...keep].sort((a, b) => a - b).forEach((p, i, all) => {
    if (i && p - all[i - 1] > 1) out.push(null);
    out.push(p);
  });
  return out;
}

function Pagination({ query, page, pages, path, defaultCorpus }: { query: ExplorerQuery; page: number; pages: number; path: string; defaultCorpus: CorpusFilter }) {
  if (pages < 2) return null;
  const href = (p: number) => `${path}${queryString(query, { page: p }, defaultCorpus)}`;
  const cell = "grid h-9 min-w-9 place-items-center rounded-md px-2 text-sm tabular-nums";
  return (
    <nav aria-label="Pages" className="mt-6 flex flex-wrap items-center justify-center gap-1">
      {page > 1 && (
        <Link href={href(page - 1)} rel="prev" className={`${cell} hover:bg-base-200`}>
          ← Précédente
        </Link>
      )}
      {pageList(page, pages).map((p, i) =>
        p === null ? (
          <span key={`gap-${i}`} className={`${cell} text-base-content/70`}>
            …
          </span>
        ) : (
          <Link key={p} href={href(p)} aria-current={p === page ? "page" : undefined} className={`${cell} ${p === page ? "bg-primary text-primary-content" : "hover:bg-base-200"}`}>
            {p}
          </Link>
        ),
      )}
      {page < pages && (
        <Link href={href(page + 1)} rel="next" className={`${cell} hover:bg-base-200`}>
          Suivante →
        </Link>
      )}
    </nav>
  );
}

const CORPUS_LABEL = { all: "Toute la Bible", nt: "Nouveau Testament", lxx: "Septante" } as const;

function FacetLink({ href, active, label, count, greek }: { href: string; active: boolean; label: string; count: number; greek?: boolean }) {
  if (!count && !active) return null;
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "true" : undefined}
      className={`flex items-baseline justify-between gap-2 rounded-md px-2 py-1 text-sm transition-colors ${active ? "bg-primary/10 font-semibold text-primary" : "hover:bg-base-200/70"}`}
    >
      <span className={greek ? "font-greek text-base" : ""}>{label}</span>
      <span className="text-xs tabular-nums text-base-content/70">{count.toLocaleString("fr-FR")}</span>
    </Link>
  );
}

function FacetGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-base-content/70">{title}</h2>
      {children}
    </section>
  );
}

export async function ConcordanceExplorer({
  searchParams,
  defaultCorpus,
  path,
  title,
}: {
  searchParams: SearchParams;
  defaultCorpus: CorpusFilter;
  path: string;
  title: string;
}) {
  const query = parseQuery(await searchParams, defaultCorpus);
  const { rows, total, page, pages, natures, facets, lemmas } = await explore(query);
  const from = (page - 1) * PAGE_SIZE + 1;
  const link = (patch: Partial<ExplorerQuery>) => `${path}${queryString(query, { ...patch, page: 1 }, defaultCorpus)}`;
  const num = "text-right tabular-nums";
  const grid = "grid grid-cols-[minmax(0,1fr)_4rem_4.5rem] gap-3 px-1 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_4rem_4.5rem] md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_4rem_4.5rem]";
  const sorts = (["freq", "alpha", ...(query.q ? ["relevance"] : []), ...(["nt", "lxx", "length"].includes(query.sort) ? [query.sort] : [])] as (keyof typeof SORTS)[]);
  const bookOptions: BookOption[] = [];
  for (const c of [NT, LXX]) {
    for (const b of await loadBooksFs(c)) bookOptions.push({ id: b.id, name: c.bookNames[b.id] ?? b.name, group: c.label });
  }
  const bookName = (id: string) => bookOptions.find((b) => b.id === id)?.name ?? id;
  const chips: { label: string; clear: Partial<ExplorerQuery> }[] = [
    ...(query.pattern ? [{ label: `Motif « ${query.pattern} »`, clear: { pattern: "" } }] : []),
    ...(query.min !== null || query.max !== null
      ? [{ label: query.min !== null && query.max !== null ? `${query.min} à ${query.max} occurrences` : query.min !== null ? `${query.min} occurrences et plus` : `${query.max} occurrences au plus`, clear: { min: null, max: null } }]
      : []),
    ...(query.presence ? [{ label: PRESENCES[query.presence], clear: { presence: null } }] : []),
    ...(query.book ? [{ label: `${BOOK_MODES[query.bookMode].replace(/^./, (c) => c.toUpperCase())} ${bookName(query.book)}`, clear: { book: null } }] : []),
    ...(query.definition ? [{ label: DEFINITIONS[query.definition], clear: { definition: null } }] : []),
  ];

  return (
    <div className="pb-12 pt-6">
      <Breadcrumb items={[{ label: "Accueil", href: "/", home: true }, { label: title }]} />
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-sm text-base-content/70">{lemmas.toLocaleString("fr-FR")} lemmes</p>
      </div>

      <div className="mt-6 grid gap-8 wide:grid-cols-[14rem_minmax(0,1fr)]">
        <aside className="hidden space-y-6 wide:block">
          <FacetGroup title="Corpus">
            {CORPUS_FILTERS.map((c) => (
              <FacetLink key={c} href={link({ corpus: c })} active={query.corpus === c} label={CORPUS_LABEL[c]} count={facets.corpus[c] ?? 0} />
            ))}
          </FacetGroup>
          <FacetGroup title="Nature">
            {natures.map((n) => (
              <FacetLink key={n.name} href={link({ nature: query.nature === n.name ? null : n.name })} active={query.nature === n.name} label={n.name} count={n.count} />
            ))}
          </FacetGroup>
          <FacetGroup title="Fréquence">
            {(Object.keys(FREQ_FILTERS) as (keyof typeof FREQ_FILTERS)[])
              .filter((f) => f !== "all")
              .map((f) => (
                <FacetLink key={f} href={link({ freq: query.freq === f ? "all" : f })} active={query.freq === f} label={FREQ_FILTERS[f]} count={facets.freq[f] ?? 0} />
              ))}
          </FacetGroup>
          <FacetGroup title="Initiale">
            <div className="grid grid-cols-6 gap-1 px-1">
              {INITIALS.map((l) => {
                const n = facets.initial[l] ?? 0;
                const on = query.initial === l;
                return n || on ? (
                  <Link
                    key={l}
                    href={link({ initial: on ? null : l })}
                    scroll={false}
                    title={`${n} lemmes`}
                    aria-current={on ? "true" : undefined}
                    className={`grid h-8 place-items-center rounded-md font-greek ${on ? "bg-primary text-primary-content" : "bg-base-200/70 hover:bg-base-300"}`}
                  >
                    {l}
                  </Link>
                ) : (
                  <span key={l} className="grid h-8 place-items-center rounded-md font-greek text-base-content/20">
                    {l}
                  </span>
                );
              })}
            </div>
          </FacetGroup>
          {(query.nature || query.freq !== "all" || query.initial || query.corpus !== defaultCorpus) && (
            <Link href={`${path}${queryString(query, { corpus: defaultCorpus, nature: null, freq: "all", initial: null, page: 1 }, defaultCorpus)}`} className="block px-2 text-sm text-primary hover:underline">
              Effacer les filtres
            </Link>
          )}
        </aside>

        <div className="min-w-0">
          <ExplorerControls query={query} natures={natures} defaultCorpus={defaultCorpus} />
          <div className="mt-3">
            <AdvancedFilters key={queryString(query, {}, defaultCorpus)} query={query} books={bookOptions} defaultCorpus={defaultCorpus} />
          </div>
          {chips.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {chips.map((c) => (
                <li key={c.label}>
                  <Link
                    href={link(c.clear)}
                    scroll={false}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 py-1 pl-3 pr-2 text-xs font-medium text-primary hover:bg-primary/15"
                  >
                    {c.label}
                    <span aria-label="Retirer">×</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6 mb-1 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-base-content/70">
              {total
                ? `${from.toLocaleString("fr-FR")} à ${(from + rows.length - 1).toLocaleString("fr-FR")} sur ${total.toLocaleString("fr-FR")}`
                : "Aucun lemme ne correspond."}
            </p>
            <nav aria-label="Tri" className="hidden gap-1 text-sm wide:flex">
              {sorts.map((k) => (
                <Link
                  key={k}
                  href={link({ sort: k })}
                  scroll={false}
                  aria-current={query.sort === k ? "true" : undefined}
                  className={`rounded-md px-2 py-1 ${query.sort === k ? "bg-base-200 font-medium" : "text-base-content/80 hover:text-base-content"}`}
                >
                  {SORTS[k]}
                </Link>
              ))}
            </nav>
          </div>

          {total > 0 && (
            <div role="table" aria-label="Lemmes" className="text-sm">
              <div role="row" className={`${grid} border-b border-base-300 py-2 text-xs text-base-content/70`}>
                <span role="columnheader">Lemme</span>
                <span role="columnheader" className="hidden sm:block">Translittération</span>
                <span role="columnheader" className="hidden md:block">Nature</span>
                <span role="columnheader" className={num}>NT</span>
                <span role="columnheader" className={num}>LXX</span>
              </div>
              <div role="rowgroup" className="divide-y divide-base-300/60">
                {rows.map((e) => (
                  <Link
                    key={e.lemma}
                    role="row"
                    href={`${e.nt > 0 ? NT.concordanceBase : LXX.concordanceBase}/${encodeURIComponent(e.lemma)}`}
                    className={`${grid} group items-baseline rounded-md py-1.5 transition-colors hover:bg-base-200/60`}
                  >
                    <span role="cell" className="min-w-0 truncate">
                      <span lang="grc" className="font-greek text-lg group-hover:text-primary">
                        {e.lemma}
                      </span>
                      <span className="ml-2 text-xs text-base-content/70 sm:hidden">{e.translitR}</span>
                    </span>
                    <span role="cell" className="hidden truncate text-base-content/80 sm:block">{e.translitR}</span>
                    <span role="cell" className="hidden truncate text-base-content/80 md:block">{e.nature.toLowerCase()}</span>
                    <span role="cell" className={`${num} ${e.nt ? "" : "text-base-content/25"} ${query.corpus === "nt" ? "font-medium" : ""}`}>{e.nt ? e.nt.toLocaleString("fr-FR") : "·"}</span>
                    <span role="cell" className={`${num} ${e.lxx ? "" : "text-base-content/25"} ${query.corpus === "lxx" ? "font-medium" : ""}`}>{e.lxx ? e.lxx.toLocaleString("fr-FR") : "·"}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <Pagination query={query} page={page} pages={pages} path={path} defaultCorpus={defaultCorpus} />
        </div>
      </div>
    </div>
  );
}
