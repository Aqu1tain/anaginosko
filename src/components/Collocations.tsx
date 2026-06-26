import Link from "next/link";
import type { Colloc } from "../data/nt";

// Voisins lexicaux : mots qui apparaissent dans les mêmes versets plus souvent
// que le hasard (PMI), classés par force d'association. Liste plutôt que graphe
// (plus lisible au pouce, et ça se partage). Rendu côté serveur, statique.
export default function Collocations({ items }: { items: Colloc[] }) {
  if (items.length === 0) return null;
  const max = items[0].score || 1;

  return (
    <div className="mt-4 rounded-box border border-base-300 bg-base-100 px-4 py-3">
      <div className="text-[0.7rem] font-medium uppercase tracking-wide text-base-content/70">
        Mots associés
      </div>
      <p className="mt-1 text-sm text-base-content/70">
        Voisins qui partagent souvent un verset, par force d’association.
      </p>

      <div className="mt-3 grid gap-0.5">
        {items.map((c) => (
          <Link
            key={c.oid}
            href={`/concordance/${encodeURIComponent(c.lemma)}`}
            className="block rounded-lg px-2 py-2 transition-colors hover:bg-base-200/60"
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
          </Link>
        ))}
      </div>
    </div>
  );
}
