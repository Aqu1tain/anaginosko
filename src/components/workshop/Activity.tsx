"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { corpusById } from "@/src/data/corpus";
import { fetchActivity, type ActivityEvent, type WorkCorpus } from "@/src/lib/workshopApi";

const LABEL: Record<ActivityEvent["kind"], string> = {
  published: "a publié",
  reverted: "a rendu à la traduction de base",
  draft: "travaille sur",
  review: "a soumis",
  changes: "doit corriger",
  comment: "a commenté",
};
const when = (iso: string) => new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

// Fil des dernières publications, versions de travail et commentaires.
export default function Activity({ corpus }: { corpus: WorkCorpus }) {
  const [events, setEvents] = useState<ActivityEvent[] | null>(null);
  const names = corpusById(corpus).bookNames;
  useEffect(() => {
    setEvents(null);
    fetchActivity(corpus).then(setEvents).catch(() => setEvents([]));
  }, [corpus]);

  if (!events) return <p className="text-sm text-base-content/50">Chargement…</p>;
  if (!events.length) return <p className="rounded-box border border-dashed border-base-300 px-4 py-8 text-center text-sm text-base-content/55">Aucune activité.</p>;
  return (
    <ol className="divide-y divide-base-300 rounded-box border border-base-300">
      {events.map((e, i) => {
        const [ch, v] = e.ref.split(":");
        return (
          <li key={`${e.at}-${i}`}>
            <Link href={`?corpus=${corpus}&book=${e.book}&ch=${ch}#v${v}`} className="block px-4 py-2.5 hover:bg-base-200/50">
              <span className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span>
                  <span className="font-medium">{e.by}</span> {LABEL[e.kind]}{" "}
                  <span className="font-medium">
                    {names[e.book] ?? e.book} {e.ref}
                  </span>
                </span>
                <span className="text-xs text-base-content/45">{when(e.at)}</span>
              </span>
              {e.text && <span className="mt-0.5 block truncate text-sm text-base-content/60">{e.text}</span>}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
