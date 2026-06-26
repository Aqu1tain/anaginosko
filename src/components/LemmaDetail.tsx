"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Breadcrumb from "../../app/_components/Breadcrumb";
import DistributionProfile from "./DistributionProfile";
import Collocations from "./Collocations";
import { glossFor } from "../data/glosses";
import { pickBaillyEntry, baillyDefinition } from "../lib/bailly";
import {
  BOOK_NAMES,
  type Colloc,
  type Distribution,
  type LemmaEntry,
  type NtBook,
  type Occ,
} from "../data/nt";

// Met en forme la notation Bailly : « || » sépare les grands sens, on met en
// gras la vedette et les repères (A, I, 1…).
function formatDefinition(text: string): React.ReactNode {
  const segments = text.split(/\s*\|\|\s*/).map((s) => s.trim()).filter(Boolean);
  return segments.map((seg, i) => {
    if (i === 0) {
      const close = seg.indexOf(")");
      if (close !== -1) {
        return (
          <p key={i} className="font-greek text-[0.95rem] leading-relaxed text-base-content/85">
            <strong className="font-semibold">{seg.slice(0, close + 1)}</strong>
            {seg.slice(close + 1)}
          </p>
        );
      }
    }
    const m = seg.match(/^([A-D]|[IVX]{1,4}|\d+)(\b.*)$/s);
    return (
      <p key={i} className="font-greek text-[0.95rem] leading-relaxed text-base-content/85">
        {m ? <><strong className="text-accent">{m[1]}</strong>{m[2]}</> : seg}
      </p>
    );
  });
}

// Définition Bailly : excerpt bundlé rendu côté serveur (indexable), puis
// définition complète récupérée en direct côté client.
function Definition({ lemma }: { lemma: string }) {
  const bundled = glossFor(lemma);
  const [text, setText] = useState<string | null>(bundled?.excerpt ?? null);
  const [uri, setUri] = useState<string | null>(bundled?.uri ?? null);
  const [state, setState] = useState<"loading" | "done" | "absent">("loading");

  useEffect(() => {
    let alive = true;
    setState("loading");
    (async () => {
      try {
        const look = await fetch(`https://api.bailly.app/lookup/${encodeURIComponent(lemma)}`).then((r) => r.json());
        const entry = pickBaillyEntry(look?.data?.entries ?? [], lemma);
        if (!entry) { if (alive) setState(text ? "done" : "absent"); return; }
        const full = await fetch(`https://api.bailly.app/entry/${encodeURIComponent(entry.uri)}?fields=definition`).then((r) => r.json());
        if (!alive) return;
        // `||` et pas `??` : la définition de tête peut être une chaîne vide
        // (entrée-conteneur), il faut alors retomber sur les sous-entrées / l'excerpt.
        setText(baillyDefinition(full?.data?.entry) || entry.excerpt || text);
        setUri(entry.uri);
        setState("done");
      } catch {
        if (alive) setState(text ? "done" : "absent");
      }
    })();
    return () => { alive = false; };
  }, [lemma]); // eslint-disable-line react-hooks/exhaustive-deps

  // Rien à montrer et plus de recherche en cours : on masque la carte (évite le
  // « Recherche… » perpétuel quand Bailly n'a pas de définition exploitable).
  if (!text && state !== "loading") return null;
  return (
    <div className="mt-3 rounded-box bg-base-200 px-4 py-3">
      <div className="text-[0.7rem] font-medium uppercase tracking-wide text-base-content/70">
        Définition · Bailly
      </div>
      {text ? (
        <div className="mt-1.5 space-y-1.5">{formatDefinition(text)}</div>
      ) : (
        <p className="mt-1 text-sm text-base-content/70">Recherche…</p>
      )}
      {state === "loading" && text && (
        <p className="mt-1 text-xs text-base-content/70">… définition complète en cours</p>
      )}
      {(uri || bundled) && (
        <a
          className="link mt-2 inline-block text-xs text-base-content/70"
          href={`https://bailly.app/${encodeURIComponent(lemma)}`}
          target="_blank"
          rel="noreferrer"
        >
          Bailly 2020 (CC BY-NC-ND) ↗
        </a>
      )}
    </div>
  );
}

function Occurrences({ entry, occ }: { entry: LemmaEntry; occ: Occ[] }) {
  return (
    <div className="mt-4">
      <div className="text-[0.7rem] font-medium uppercase tracking-wide text-base-content/70">
        Occurrences
      </div>
      {entry.count > occ.length && (
        <p className="mt-1 text-sm text-base-content/70">
          {occ.length} premières occurrences sur {entry.count}.
        </p>
      )}
      <div className="mt-2 grid gap-1.5 wide:grid-cols-2 wide:gap-x-3">
        {occ.map((o, i) => (
          <Link
            key={i}
            href={`/nt/${o.b}/${o.c}?w=${o.w}`}
            className="flex items-center gap-3 rounded-box border border-base-300 bg-base-100 px-3.5 py-2.5 transition-colors hover:border-primary/40"
          >
            <span className="font-greek min-w-0 flex-1 truncate text-lg">{o.f}</span>
            <span className="shrink-0 text-sm text-base-content/70">
              {BOOK_NAMES[o.b] ?? o.b} {o.c}:{o.v}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function LemmaDetail({
  entry,
  occ,
  dist,
  books,
  colloc,
}: {
  entry: LemmaEntry;
  occ: Occ[];
  dist: Distribution;
  books: NtBook[];
  colloc: Colloc[];
}) {
  return (
    <div className="pb-4">
      <Breadcrumb
        items={[
          { label: "Accueil", href: "/", home: true },
          { label: "Concordance", href: "/concordance" },
          { label: entry.lemma, greek: true },
        ]}
      />
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="font-greek text-3xl">{entry.lemma}</h1>
        <span className="text-sm text-base-content/70">{entry.translitR}</span>
        <span className="text-xs text-base-content/70">érasmien&nbsp;: {entry.translit}</span>
        <span className="text-sm text-base-content/70">· {entry.nature}</span>
      </div>
      <p className="mt-1 text-sm text-base-content/70">
        {entry.count} occurrence{entry.count > 1 ? "s" : ""} dans le NT
      </p>
      {/* Desktop : on éclate la pile. En haut, deux colonnes d'analyse — sens +
          répartition à gauche, voisins à droite. En dessous, les occurrences en
          pleine largeur, réparties en colonnes. Quand la grille retombe en une
          colonne (mobile), l'ordre source reste Définition → Répartition →
          Associés → Occurrences. */}
      <div className="wide:grid wide:grid-cols-2 wide:items-start wide:gap-8">
        <div className="min-w-0">
          <Definition lemma={entry.lemma} />
          <DistributionProfile entry={entry} dist={dist} books={books} occ={occ} />
        </div>
        <div className="min-w-0">
          <Collocations items={colloc} occ={occ} />
        </div>
      </div>
      <Occurrences entry={entry} occ={occ} />
    </div>
  );
}
