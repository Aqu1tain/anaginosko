import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/app/_components/Breadcrumb";
import ExplorerControls from "@/src/components/concordance/ExplorerControls";
import { explore } from "@/lib/lemmaExplorer";
import { PAGE_SIZE, parseQuery, queryString, type CorpusFilter, type ExplorerQuery } from "@/src/data/explorerQuery";
import { LXX, NT } from "@/src/data/corpus";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// Vue filtrée ou recherche : explorable par les liens, mais seule la liste par
// défaut (et ses pages) est indexée.
export async function explorerMetadata(searchParams: SearchParams, defaultCorpus: CorpusFilter, base: Metadata): Promise<Metadata> {
  const query = parseQuery(await searchParams, defaultCorpus);
  const filtered = !!(query.q || query.nature || query.initial || query.freq !== "all" || query.corpus !== defaultCorpus || query.sort !== "freq");
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
          <span key={`gap-${i}`} className={`${cell} text-base-content/40`}>
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
  const { rows, total, page, pages, natures, lemmas } = await explore(query);
  const from = (page - 1) * PAGE_SIZE + 1;
  const num = "text-right tabular-nums";

  return (
    <div className="max-w-4xl pb-8">
      <Breadcrumb items={[{ label: "Accueil", href: "/", home: true }, { label: title }]} />
      <h1 className="text-3xl font-bold">{title}</h1>
      <p className="mt-1 text-sm text-base-content/55">
        {lemmas.toLocaleString("fr-FR")} lemmes, Nouveau Testament et Septante.
      </p>

      <div className="mt-5">
        <ExplorerControls query={query} natures={natures} defaultCorpus={defaultCorpus} />
      </div>

      <p className="mt-6 mb-2 text-sm text-base-content/60">
        {total ? `${from.toLocaleString("fr-FR")} à ${(from + rows.length - 1).toLocaleString("fr-FR")} sur ${total.toLocaleString("fr-FR")}` : "Aucun lemme ne correspond."}
      </p>

      {total > 0 && (
        <table className="w-full text-sm">
          <thead className="border-b border-base-300 text-left text-xs text-base-content/55">
            <tr>
              <th className="py-2 pr-3 font-medium">Lemme</th>
              <th className="hidden py-2 pr-3 font-medium sm:table-cell">Translittération</th>
              <th className="hidden py-2 pr-3 font-medium md:table-cell">Nature</th>
              <th className={`py-2 pr-3 font-medium ${num} ${query.corpus === "lxx" ? "hidden sm:table-cell" : ""}`}>NT</th>
              <th className={`py-2 font-medium ${num} ${query.corpus === "nt" ? "hidden sm:table-cell" : ""}`}>LXX</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-base-300/60">
            {rows.map((e) => {
              const href = `${e.nt > 0 ? NT.concordanceBase : LXX.concordanceBase}/${encodeURIComponent(e.lemma)}`;
              return (
                <tr key={e.lemma} className="group hover:bg-base-200/50">
                  <td className="py-1.5 pr-3">
                    <Link href={href} lang="grc" className="font-greek text-lg group-hover:text-primary">
                      {e.lemma}
                    </Link>
                    <span className="ml-2 text-xs text-base-content/50 sm:hidden">{e.translitR}</span>
                  </td>
                  <td className="hidden py-1.5 pr-3 text-base-content/60 sm:table-cell">{e.translitR}</td>
                  <td className="hidden py-1.5 pr-3 text-base-content/60 md:table-cell">{e.nature.toLowerCase()}</td>
                  <td className={`py-1.5 pr-3 ${num} ${query.corpus === "lxx" ? "hidden sm:table-cell" : ""} ${e.nt ? "" : "text-base-content/25"}`}>{e.nt ? e.nt.toLocaleString("fr-FR") : "·"}</td>
                  <td className={`py-1.5 ${num} ${query.corpus === "nt" ? "hidden sm:table-cell" : ""} ${e.lxx ? "" : "text-base-content/25"}`}>{e.lxx ? e.lxx.toLocaleString("fr-FR") : "·"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <Pagination query={query} page={page} pages={pages} path={path} defaultCorpus={defaultCorpus} />
    </div>
  );
}
