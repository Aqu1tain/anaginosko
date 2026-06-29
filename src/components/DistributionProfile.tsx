"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  type Distribution,
  type LemmaEntry,
  type NtBook,
  type Occ,
} from "../data/nt";
import type { CorpusConfig } from "../data/corpus";

type Row = {
  id: string;
  name: string;
  count: number;
  value: number;
  color: string;
};

function Seg({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`btn join-item btn-sm ${active ? "btn-primary" : "btn-outline border-base-300"}`}
    >
      {children}
    </button>
  );
}

function Verses({ occ, row, routePrefix }: { occ: Occ[]; row: Row; routePrefix: string }) {
  const verses = occ.filter((o) => o.b === row.id);
  return (
    <div className="mt-1 mb-2 ml-2 grid gap-1 border-l-2 border-base-300 pl-2">
      {verses.map((o, i) => (
        <Link
          key={i}
          href={`${routePrefix}/${o.b}/${o.c}?w=${o.w}`}
          className="flex items-center gap-2 rounded px-1.5 py-1 text-sm transition-colors hover:bg-base-200"
        >
          <span className="font-greek min-w-0 flex-1 truncate">{o.f}</span>
          <span className="shrink-0 text-xs text-base-content/70">
            {row.name} {o.c}:{o.v}
          </span>
        </Link>
      ))}
      {row.count > verses.length && (
        <p className="px-1.5 text-xs text-base-content/70">
          {verses.length} premières sur {row.count}.
        </p>
      )}
    </div>
  );
}

export default function DistributionProfile({
  entry,
  dist,
  books,
  occ,
  corpus,
}: {
  entry: LemmaEntry;
  dist: Distribution;
  books: NtBook[];
  occ: Occ[];
  corpus: CorpusConfig;
}) {
  const [mode, setMode] = useState<"raw" | "density">("raw");
  const [grouped, setGrouped] = useState(false);
  const [log, setLog] = useState(false);
  const [openBook, setOpenBook] = useState<string | null>(null);
  const groupOf = (id: string) => corpus.subGroups.find((g) => g.books.includes(id));

  const wordsByBook = useMemo(() => {
    const m: Record<string, number> = {};
    for (const b of books) m[b.id] = b.words;
    return m;
  }, [books]);

  const rows = useMemo<Row[]>(() => {
    return corpus.bookOrder.map((id) => {
      const count = dist[id] ?? 0;
      const words = wordsByBook[id] || 1;
      const value = mode === "density" ? (count / words) * 1000 : count;
      return { id, name: corpus.bookNames[id], count, value, color: groupOf(id)?.color ?? "#888" };
    }).filter((r) => r.count > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dist, mode, wordsByBook, corpus]);

  if (rows.length === 0) return null;

  const present = rows.length;
  const absent = corpus.bookOrder.length - present;
  const maxRaw = Math.max(1, ...rows.map((r) => r.count));
  const maxValue = Math.max(...rows.map((r) => r.value), 1e-9);
  const showLog = maxRaw >= 25;
  const widthPct = (v: number) =>
    log ? (Math.log(v + 1) / Math.log(maxValue + 1)) * 100 : (v / maxValue) * 100;
  const label = (r: Row) => (mode === "density" ? r.value.toFixed(1) : String(r.count));
  const isHapax = entry.count === 1;

  const BarRow = (r: Row) => {
    const open = openBook === r.id;
    return (
      <div key={r.id}>
        <button
          onClick={() => setOpenBook((b) => (b === r.id ? null : r.id))}
          aria-expanded={open}
          className={`block w-full rounded-lg px-2 py-2 text-left transition-colors hover:bg-base-200/60 active:bg-base-200 ${open ? "bg-base-200/60" : ""}`}
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="min-w-0 truncate text-sm font-medium">{r.name}</span>
            <span className="shrink-0 text-xs tabular-nums text-base-content/70">{label(r)}</span>
          </div>
          <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-base-200">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max(widthPct(r.value), 2)}%`, backgroundColor: r.color }}
            />
          </div>
        </button>
        {open && <Verses occ={occ} row={r} routePrefix={corpus.routePrefix} />}
      </div>
    );
  };

  const groupView = () => {
    const blocks = corpus.subGroups.map((g) => {
      const grows = rows.filter((r) => groupOf(r.id)?.id === g.id);
      const subtotal = grows.reduce((a, r) => a + r.count, 0);
      return { g, grows, subtotal };
    });
    const empty = blocks.filter((b) => b.grows.length === 0).map((b) => b.g.title);
    return (
      <div className="mt-3 grid gap-3">
        {blocks
          .filter((b) => b.grows.length > 0)
          .map(({ g, grows, subtotal }) => (
            <div key={g.id}>
              <div className="mb-0.5 flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: g.color }} />
                <span className="text-xs font-semibold">{g.title}</span>
                <span className="text-xs text-base-content/70">· {subtotal}</span>
              </div>
              {grows.map(BarRow)}
            </div>
          ))}
        {empty.length > 0 && (
          <p className="text-xs text-base-content/70">Absent : {empty.join(", ")}.</p>
        )}
      </div>
    );
  };

  return (
    <div className="mt-4 rounded-box border border-base-300 bg-base-100 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[0.7rem] font-medium uppercase tracking-wide text-base-content/70">
          Répartition · {corpus.label}
        </div>
        {isHapax && <span className="badge badge-sm badge-warning badge-soft">hapax legomenon</span>}
      </div>

      <p className="mt-1 text-sm text-base-content/70">
        {entry.count} occurrence{entry.count > 1 ? "s" : ""} · {present} livre{present > 1 ? "s" : ""}
        {absent > 0 && <span className="text-base-content/70"> · absent de {absent} autres</span>}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <div className="join">
          <Seg active={mode === "raw"} onClick={() => setMode("raw")}>
            Brut
          </Seg>
          <Seg active={mode === "density"} onClick={() => setMode("density")}>
            Densité
          </Seg>
        </div>
        <div className="join">
          <Seg active={!grouped} onClick={() => setGrouped(false)}>
            Par livre
          </Seg>
          <Seg active={grouped} onClick={() => setGrouped(true)}>
            Par corpus
          </Seg>
        </div>
        {showLog && (
          <button
            onClick={() => setLog((v) => !v)}
            aria-pressed={log}
            className={`btn btn-sm ${log ? "btn-primary" : "btn-outline border-base-300"}`}
          >
            Logarithmique
          </button>
        )}
      </div>

      <p className="mt-2 text-xs text-base-content/70">
        {mode === "density"
          ? "Occurrences pour 1000 mots du livre. Touchez un livre pour ses versets."
          : "Touchez un livre pour voir ses versets."}
      </p>

      {grouped ? groupView() : <div className="mt-3 grid gap-0.5">{rows.map(BarRow)}</div>}
    </div>
  );
}
