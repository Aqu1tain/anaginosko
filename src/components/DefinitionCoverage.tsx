"use client";

import { useEffect, useMemo, useState } from "react";
import { NT, LXX } from "../data/corpus";
import { assessGloss, type Gloss } from "../data/glosses";
import type { LemmaEntry } from "../data/nt";
import type { Annotation } from "../lib/api";

type CorpusId = "nt" | "lxx";
type Filter = CorpusId | "all";
type SourceData = Record<CorpusId, { lemmas: LemmaEntry[]; glosses: Record<string, Gloss> }>;
type CoverageRow = LemmaEntry & { inNt: boolean; inLxx: boolean; hasLexicon: boolean };

const EMPTY: SourceData = {
  nt: { lemmas: [], glosses: {} },
  lxx: { lemmas: [], glosses: {} },
};

const percent = (part: number, total: number) =>
  total ? new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format((part / total) * 100) : "0";

function Metric({ value, label, detail, tone = "" }: { value: number; label: string; detail: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-base-300 bg-base-100 px-3.5 py-3">
      <p className={`text-xl font-bold tabular-nums ${tone}`}>{value.toLocaleString("fr-FR")}</p>
      <p className="text-xs font-medium">{label}</p>
      <p className="mt-0.5 text-[0.7rem] text-base-content/55">{detail}</p>
    </div>
  );
}

export default function DefinitionCoverage({ definitions }: { definitions: Annotation[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [data, setData] = useState<SourceData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    const read = async <T,>(url: string, fallback: T): Promise<T> => {
      try {
        const response = await fetch(url);
        return response.ok ? await response.json() as T : fallback;
      } catch {
        return fallback;
      }
    };
    Promise.all([
      read<LemmaEntry[]>("/nt/lemmas.json", []),
      read<Record<string, Gloss>>("/nt/glosses.json", {}),
      read<LemmaEntry[]>("/lxx/lemmas.json", []),
      read<Record<string, Gloss>>("/lxx/glosses.json", {}),
    ])
      .then(([ntLemmas, ntGlosses, lxxLemmas, lxxGlosses]) => {
        if (!alive) return;
        setData({
          nt: { lemmas: ntLemmas, glosses: ntGlosses },
          lxx: { lemmas: lxxLemmas, glosses: lxxGlosses },
        });
        if (ntLemmas.length === 0 && lxxLemmas.length === 0) setFailed(true);
      })
      .catch(() => alive && setFailed(true))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const definitionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const definition of definitions) {
      const lemma = definition.ref.slice(4);
      counts.set(lemma, (counts.get(lemma) ?? 0) + 1);
    }
    return counts;
  }, [definitions]);

  const rows = useMemo<CoverageRow[]>(() => {
    const selected: CorpusId[] = filter === "all" ? ["nt", "lxx"] : [filter];
    const merged = new Map<string, CoverageRow>();
    for (const corpusId of selected) {
      for (const entry of data[corpusId].lemmas) {
        const verified = assessGloss(entry.lemma, data[corpusId].glosses[entry.lemma]).status === "verified";
        const previous = merged.get(entry.lemma);
        if (previous) {
          previous.count += entry.count;
          previous.hasLexicon ||= verified;
          previous.inNt ||= corpusId === "nt";
          previous.inLxx ||= corpusId === "lxx";
        } else {
          merged.set(entry.lemma, {
            ...entry,
            inNt: corpusId === "nt",
            inLxx: corpusId === "lxx",
            hasLexicon: verified,
          });
        }
      }
    }
    return [...merged.values()];
  }, [data, filter]);

  const stats = useMemo(() => {
    const totalOccurrences = rows.reduce((sum, row) => sum + row.count, 0);
    const biblion = rows.filter((row) => definitionCounts.has(row.lemma));
    const available = rows.filter((row) => definitionCounts.has(row.lemma) || row.hasLexicon);
    const missing = rows.filter((row) => !definitionCounts.has(row.lemma) && !row.hasLexicon);
    const duplicateCount = [...definitionCounts.values()].reduce((sum, count) => sum + Math.max(0, count - 1), 0);
    return {
      totalOccurrences,
      biblion,
      available,
      missing,
      duplicateCount,
      availableOccurrences: available.reduce((sum, row) => sum + row.count, 0),
    };
  }, [definitionCounts, rows]);

  const priorities = useMemo(
    () => rows
      .filter((row) => !definitionCounts.has(row.lemma))
      .sort((a, b) => b.count - a.count || a.lemma.localeCompare(b.lemma, "el"))
      .slice(0, 8),
    [definitionCounts, rows],
  );

  if (failed) {
    return <p className="mb-5 rounded-xl bg-base-200 px-3 py-2 text-sm text-base-content/65">Couverture lexicale indisponible.</p>;
  }

  return (
    <div className="mb-6 rounded-2xl border border-base-300 bg-base-200/40 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Couverture des sens</h2>
          <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-base-content/60">
            Une définition Biblion est commune aux corpus. Bailly sert de repli seulement quand sa vedette correspond exactement au lemme.
          </p>
        </div>
        <div className="join" role="group" aria-label="Corpus de la couverture">
          {(["all", "nt", "lxx"] as const).map((id) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={`btn join-item btn-xs ${filter === id ? "btn-primary" : "btn-ghost border border-base-300"}`}
            >
              {id === "all" ? "Tous" : id === "nt" ? NT.shortLabel : LXX.shortLabel}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="mt-5 flex items-center gap-2 text-sm text-base-content/60">
          <span className="loading loading-spinner loading-sm" aria-hidden="true" />
          Calcul de la couverture…
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Metric
              value={rows.length}
              label="Lemmes"
              detail={`${stats.totalOccurrences.toLocaleString("fr-FR")} occurrences`}
            />
            <Metric
              value={stats.biblion.length}
              label="Révisés par Biblion"
              detail={`${percent(stats.biblion.length, rows.length)} % des lemmes`}
              tone="text-primary"
            />
            <Metric
              value={stats.available.length}
              label="Sens fiable affichable"
              detail={`${percent(stats.availableOccurrences, stats.totalOccurrences)} % des occurrences`}
              tone="text-success"
            />
            <Metric
              value={stats.missing.length}
              label="À documenter"
              detail={`${percent(stats.missing.length, rows.length)} % des lemmes`}
              tone={stats.missing.length ? "text-warning" : "text-success"}
            />
          </div>

          {stats.duplicateCount > 0 && (
            <p className="mt-3 rounded-lg border border-warning/35 bg-warning/10 px-3 py-2 text-xs text-base-content/75">
              {stats.duplicateCount} définition{stats.duplicateCount > 1 ? "s" : ""} en doublon. Une seule définition devrait être active par lemme.
            </p>
          )}

          <div className="mt-5 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">À traiter en priorité</h3>
              <p className="text-xs text-base-content/55">Lemmes les plus fréquents sans définition Biblion.</p>
            </div>
          </div>
          <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {priorities.map((row) => {
              const base = row.inNt ? NT.concordanceBase : LXX.concordanceBase;
              return (
                <a
                  key={row.lemma}
                  href={`${base}/${encodeURIComponent(row.lemma)}`}
                  className="group flex items-center gap-3 rounded-xl border border-base-300 bg-base-100 px-3 py-2.5 transition-colors hover:border-primary/40"
                >
                  <span className="font-greek min-w-0 flex-1 truncate text-lg group-hover:text-primary">{row.lemma}</span>
                  <span className={`badge badge-xs ${row.hasLexicon ? "badge-ghost" : "badge-warning badge-soft"}`}>
                    {row.hasLexicon ? "Bailly vérifié" : "Sans sens"}
                  </span>
                  <span className="min-w-10 text-right text-xs tabular-nums text-base-content/55">{row.count.toLocaleString("fr-FR")}×</span>
                </a>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
