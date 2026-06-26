"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BOOK_NAMES, type Colloc, type Occ } from "../data/nt";

// Versets communs au lemme courant et au voisin, dépliés sous celui-ci (comme la
// répartition déplie les versets d'un livre). On retrouve la forme fléchie et
// l'index du mot du lemme courant via ses occurrences pour pointer + surligner.
function SharedVerses({ colloc, formByVerse }: { colloc: Colloc; formByVerse: Map<string, Occ> }) {
  const verses = colloc.verses ?? [];
  return (
    <div className="mt-1 mb-2 ml-2 grid gap-1 border-l-2 border-base-300 pl-2">
      {verses.map((vr, i) => {
        const o = formByVerse.get(`${vr.b}:${vr.c}:${vr.v}`);
        const href = o ? `/nt/${vr.b}/${vr.c}?w=${o.w}` : `/nt/${vr.b}/${vr.c}`;
        return (
          <Link
            key={i}
            href={href}
            className="flex items-center gap-2 rounded px-1.5 py-1 text-sm transition-colors hover:bg-base-200"
          >
            {o && <span className="font-greek min-w-0 flex-1 truncate">{o.f}</span>}
            <span className={`shrink-0 text-xs text-base-content/70 ${o ? "" : "flex-1"}`}>
              {BOOK_NAMES[vr.b] ?? vr.b} {vr.c}:{vr.v}
            </span>
          </Link>
        );
      })}
      {colloc.n > verses.length && (
        <p className="px-1.5 text-xs text-base-content/70">
          {verses.length} premiers sur {colloc.n}.
        </p>
      )}
      <Link
        href={`/concordance/${encodeURIComponent(colloc.lemma)}`}
        className="link px-1.5 py-1 text-xs text-base-content/70"
      >
        Concordance de <span className="font-greek">{colloc.lemma}</span> →
      </Link>
    </div>
  );
}

// Voisins lexicaux : mots qui apparaissent dans les mêmes versets plus souvent
// que le hasard (PMI), classés par force d'association. On peut déplier chaque
// mot pour voir les versets qu'il partage avec le lemme courant.
export default function Collocations({ items, occ }: { items: Colloc[]; occ: Occ[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const formByVerse = useMemo(() => {
    const m = new Map<string, Occ>();
    for (const o of occ) m.set(`${o.b}:${o.c}:${o.v}`, o);
    return m;
  }, [occ]);

  if (items.length === 0) return null;
  const max = items[0].score || 1;

  return (
    <div className="mt-4 rounded-box border border-base-300 bg-base-100 px-4 py-3">
      <div className="text-[0.7rem] font-medium uppercase tracking-wide text-base-content/70">
        Mots associés
      </div>
      <p className="mt-1 text-sm text-base-content/70">
        Voisins qui partagent souvent un verset. Touchez un mot pour ses versets communs.
      </p>

      <div className="mt-3 grid gap-0.5">
        {items.map((c, i) => {
          const isOpen = open === i;
          return (
            <div key={c.oid}>
              <button
                onClick={() => setOpen((p) => (p === i ? null : i))}
                aria-expanded={isOpen}
                className={`block w-full rounded-lg px-2 py-2 text-left transition-colors hover:bg-base-200/60 active:bg-base-200 ${isOpen ? "bg-base-200/60" : ""}`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0 truncate">
                    <span className="font-greek text-lg">{c.lemma}</span>
                    <span className="ml-2 text-sm text-base-content/70">{c.translitR}</span>
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-base-content/70">
                    {c.n} versets
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-base-200">
                  <div
                    className="h-full rounded-full bg-secondary"
                    style={{ width: `${Math.max((c.score / max) * 100, 4)}%` }}
                  />
                </div>
              </button>
              {isOpen && <SharedVerses colloc={c} formByVerse={formByVerse} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
