"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Distribution } from "../../data/nt";
import type { CorpusConfig } from "../../data/corpus";
import type { KwicLine, KwicPage } from "@/lib/kwic";

export type FeedSource = { corpus: CorpusConfig; lemma: string; dist: Distribution };
type Line = KwicLine & { corpus: CorpusConfig };
type Cursor = { src: number; offset: number } | null;

const countIn = (s: FeedSource, book: string | null) =>
  book ? (s.dist[book] ?? 0) : Object.values(s.dist).reduce((n, x) => n + x, 0);

// Liste des occurrences en contexte, groupée par livre, chargée page par page.
// Plusieurs sources (NT puis LXX) s'enchaînent pour la vue « les deux ».
export default function OccurrenceFeed({
  sources,
  book,
  initial,
}: {
  sources: FeedSource[];
  book: string | null;
  initial?: KwicPage;
}) {
  const active = sources.filter((s) => countIn(s, book) > 0);
  const total = active.reduce((n, s) => n + countIn(s, book), 0);
  const key = `${active.map((s) => `${s.corpus.id}:${s.lemma}`).join("|")}#${book ?? ""}`;
  const seeded = !!initial && !book && active.length > 0 && active[0] === sources[0];

  const [lines, setLines] = useState<Line[]>(() => (seeded ? initial!.lines.map((l) => ({ ...l, corpus: sources[0].corpus })) : []));
  const [cursor, setCursor] = useState<Cursor>(() =>
    seeded ? (initial!.next !== null ? { src: 0, offset: initial!.next } : active.length > 1 ? { src: 1, offset: 0 } : null) : { src: 0, offset: 0 },
  );
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [loadedKey, setLoadedKey] = useState(key);

  const more = useCallback(
    async (from: Cursor, reset: boolean) => {
      if (!from) return;
      const s = active[from.src];
      if (!s) return;
      setLoading(true);
      setFailed(false);
      try {
        const q = new URLSearchParams({ offset: String(from.offset), ...(book ? { book } : {}) });
        const res = await fetch(`/concordance/api/kwic/${s.corpus.id}/${encodeURIComponent(s.lemma)}?${q}`);
        if (!res.ok) throw new Error();
        const page = (await res.json()) as KwicPage;
        setLines((prev) => [...(reset ? [] : prev), ...page.lines.map((l) => ({ ...l, corpus: s.corpus }))]);
        setCursor(page.next !== null ? { src: from.src, offset: page.next } : from.src + 1 < active.length ? { src: from.src + 1, offset: 0 } : null);
      } catch {
        setFailed(true);
      }
      setLoading(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );

  useEffect(() => {
    if (key === loadedKey && lines.length) return;
    setLoadedKey(key);
    setLines([]);
    more({ src: 0, offset: 0 }, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <section aria-label="Occurrences">
      <ol className="divide-y divide-base-300/70">
        {lines.map((l, i) => {
          const heading = i === 0 || l.b !== lines[i - 1].b;
          const prefix = l.corpus.routePrefixOf?.(l.b) ?? l.corpus.routePrefix;
          return (
            <Fragment key={`${l.corpus.id}-${l.b}-${l.c}-${l.w}`}>
              {heading && (
                <li className="sticky top-14 z-[1] flex items-baseline justify-between bg-base-100/95 pb-1.5 pt-5 backdrop-blur first:pt-0">
                  <h3 className="font-semibold">{l.corpus.bookNames[l.b] ?? l.b}</h3>
                  <span className="text-xs tabular-nums text-base-content/50">{l.corpus.id === "lxx" ? "LXX · " : ""}{(active.find((s) => s.corpus.id === l.corpus.id)?.dist[l.b]) ?? ""}</span>
                </li>
              )}
              <li>
                <Link
                  href={`${prefix}/${l.b}/${l.c}?w=${l.w}#v${l.v}`}
                  className="grid grid-cols-[3.25rem_minmax(0,1fr)] items-baseline gap-3 rounded-md px-1 py-2 transition-colors hover:bg-base-200/70"
                >
                  <span className="text-xs tabular-nums text-base-content/50">
                    {l.c}:{l.v}
                  </span>
                  <span lang="grc" className="font-greek text-[1.05rem] leading-snug sm:grid sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-1.5">
                    <span className="text-base-content/70 sm:truncate sm:text-right sm:[direction:rtl]">
                      <bdi>
                        {l.cutLeft && "… "}
                        {l.left}
                      </bdi>{" "}
                    </span>
                    <strong className="font-semibold text-primary">{l.form}</strong>{" "}
                    <span className="text-base-content/70 sm:truncate">
                      {l.right}
                      {l.cutRight && " …"}
                    </span>
                  </span>
                </Link>
              </li>
            </Fragment>
          );
        })}
      </ol>

      {loading && <p className="py-4 text-sm text-base-content/55">Chargement…</p>}
      {failed && (
        <button type="button" className="btn btn-ghost btn-sm mt-3" onClick={() => more(cursor ?? { src: 0, offset: 0 }, !lines.length)}>
          Réessayer
        </button>
      )}
      {!loading && !failed && cursor && lines.length > 0 && (
        <button type="button" className="btn btn-outline btn-sm mt-4 w-full" onClick={() => more(cursor, false)}>
          Afficher plus · {total - lines.length} restantes
        </button>
      )}
    </section>
  );
}
