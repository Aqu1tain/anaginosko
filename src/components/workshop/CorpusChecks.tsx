"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { corpusById } from "@/src/data/corpus";
import { fetchChecks, type CheckIssue, type WorkCorpus } from "@/src/lib/workshopApi";

const STATUS: Record<string, string> = { published: "publié", draft: "brouillon", review: "à relire", changes: "à corriger" };

// Vérifications de tout le corpus : termes clés et typographie, filtrables.
export default function CorpusChecks({ corpus }: { corpus: WorkCorpus }) {
  const [data, setData] = useState<{ checked: number; issues: CheckIssue[] } | null>(null);
  const [kind, setKind] = useState<"all" | "term" | "typo">("all");
  const [error, setError] = useState("");
  const names = corpusById(corpus).bookNames;

  useEffect(() => {
    setData(null);
    fetchChecks(corpus).then(setData).catch((e) => setError(e.message));
  }, [corpus]);

  if (error) return <p className="text-sm text-error">{error}</p>;
  if (!data) return <p className="text-sm text-base-content/50">Vérification de tout le corpus…</p>;
  const shown = data.issues.filter((i) => kind === "all" || i.kind === kind);
  const count = (k: "term" | "typo") => data.issues.filter((i) => i.kind === k).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-base-content/60">
          {data.checked.toLocaleString("fr-FR")} versets vérifiés · {data.issues.length} alerte{data.issues.length > 1 ? "s" : ""}
        </p>
        <div className="flex gap-1 rounded-full bg-base-200 p-1 text-sm">
          {(
            [
              ["all", `Toutes (${data.issues.length})`],
              ["term", `Termes clés (${count("term")})`],
              ["typo", `Typographie (${count("typo")})`],
            ] as const
          ).map(([k, label]) => (
            <button key={k} type="button" onClick={() => setKind(k)} className={`rounded-full px-3 py-1 font-medium ${kind === k ? "bg-base-100 shadow-sm" : "text-base-content/60"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {shown.length ? (
        <ul className="divide-y divide-base-300 rounded-box border border-base-300">
          {shown.slice(0, 500).map((i) => {
            const [ch, v] = i.ref.split(":");
            return (
              <li key={`${i.book}${i.ref}${i.message}`}>
                <Link href={`?corpus=${corpus}&book=${i.book}&ch=${ch}#v${v}`} className="grid gap-1 px-4 py-2.5 hover:bg-base-200/50 sm:grid-cols-[9rem_minmax(0,1fr)]">
                  <span className="text-sm font-medium">
                    {names[i.book] ?? i.book} {i.ref}
                    <span className="block text-xs font-normal text-base-content/45">{STATUS[i.status] ?? i.status}</span>
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-sm ${i.kind === "term" ? "text-warning-content" : "text-error"}`}>{i.message}</span>
                    <span className="block truncate text-sm text-base-content/60">{i.text}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-box border border-dashed border-base-300 px-4 py-8 text-center text-sm text-base-content/55">Rien à signaler.</p>
      )}
    </div>
  );
}
