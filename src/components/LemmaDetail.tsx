"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Breadcrumb from "../../app/_components/Breadcrumb";
import DistributionProfile from "./DistributionProfile";
import Collocations from "./Collocations";
import AnnotationEditor, { type AnnotationTarget } from "./AnnotationEditor";
import { useAuth } from "../hooks/useAuth";
import { useLemmaNotes } from "../hooks/useLemmaNotes";
import { useLemmaDefinition } from "../hooks/useLemmaDefinition";
import { type Annotation } from "../lib/api";
import { glossFor } from "../data/glosses";
import { pickBaillyEntry, baillyDefinition } from "../lib/bailly";
import {
  type Colloc,
  type Distribution,
  type LemmaEntry,
  type NtBook,
  type Occ,
} from "../data/nt";
import { type CorpusConfig, NT, LXX, GREEK_BIBLE } from "../data/corpus";

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
// définition complète récupérée en direct côté client. `secondary` = une
// définition Biblion la coiffe, on la présente en repli, plus discret.
function Definition({ lemma, secondary = false }: { lemma: string; secondary?: boolean }) {
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
    <div className={`rounded-box bg-base-200 px-4 py-3 ${secondary ? "mt-2 opacity-80" : "mt-3"}`}>
      <div className="text-[0.7rem] font-medium uppercase tracking-wide text-base-content/70">
        {secondary ? "Aussi · Bailly" : "Définition · Bailly"}
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

function Occurrences({ entry, occ, corpus }: { entry: LemmaEntry; occ: Occ[]; corpus: CorpusConfig }) {
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
            href={`${corpus.routePrefixOf?.(o.b) ?? corpus.routePrefix}/${o.b}/${o.c}?w=${o.w}`}
            className="flex items-center gap-3 rounded-box border border-base-300 bg-base-100 px-3.5 py-2.5 transition-colors hover:border-primary/40"
          >
            <span className="font-greek min-w-0 flex-1 truncate text-lg">{o.f}</span>
            <span className="shrink-0 text-sm text-base-content/70">
              {corpus.bookNames[o.b] ?? o.b} {o.c}:{o.v}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// Définition Biblion : système à part des annotations (ref « def:<lemma> »),
// PRIORITAIRE sur Bailly. Quand elle existe, elle coiffe la fiche ; Bailly passe
// en repli. Éditable par les philologues/admin.
function LemmaDefinitions({ lemma }: { lemma: string }) {
  const { user } = useAuth();
  const canEdit = user?.role === "admin" || user?.role === "philologist";
  const { definition, reload } = useLemmaDefinition(lemma);
  const [editing, setEditing] = useState(false);

  const target: AnnotationTarget = {
    ref: `def:${lemma}`,
    verse: null,
    wordIndex: null,
    endWordIndex: null,
    graphemeIndex: null,
    grec: lemma,
    scopeLabel: "définition",
    existing: definition ?? undefined,
  };

  return (
    <>
      {definition ? (
        <>
          <section className="mt-3 rounded-box border border-primary/40 bg-primary/5 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[0.7rem] font-medium uppercase tracking-wide text-primary">
                Définition · Biblion
              </div>
              {canEdit && (
                <button onClick={() => setEditing(true)} className="btn btn-ghost btn-xs">
                  Modifier
                </button>
              )}
            </div>
            <div className="mt-1.5 space-y-1.5 text-[0.95rem] leading-relaxed text-base-content/90">
              {definition.body.split(/\n+/).filter(Boolean).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            {(definition.author?.displayName || definition.source || definition.link) && (
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs text-base-content/70">
                {definition.author?.displayName && <span className="font-greek">{definition.author.displayName}</span>}
                {definition.source && <span>· {definition.source}</span>}
                {definition.link && (
                  <a href={definition.link} target="_blank" rel="noreferrer" className="link text-primary">
                    source ↗
                  </a>
                )}
              </div>
            )}
          </section>
          <Definition lemma={lemma} secondary />
        </>
      ) : (
        <>
          <Definition lemma={lemma} />
          {canEdit && definition === null && (
            <button onClick={() => setEditing(true)} className="btn btn-ghost btn-xs mt-2 text-primary">
              + Définition Biblion
            </button>
          )}
        </>
      )}

      {editing && (
        <AnnotationEditor
          target={target}
          title="Définition Biblion"
          bodyLabel="Définition"
          bodyPlaceholder="Sens du mot dans le grec biblique, quand Bailly est imprécis ou absent…"
          requireSource={false}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            reload();
          }}
        />
      )}
    </>
  );
}

// Note philologique de Biblion attachée au lemme (ref « lemma:<lemma> », sans
// index de mot). Affichée pour tous ; un contributeur peut l'ajouter/modifier.
function BiblionNote({ lemma }: { lemma: string }) {
  const { user } = useAuth();
  const canEdit = user?.role === "admin" || user?.role === "philologist";
  const annoRef = `lemma:${lemma}`;
  const { notes, reload } = useLemmaNotes(lemma);
  const [editing, setEditing] = useState<AnnotationTarget | null>(null);

  if (notes === null) return null;
  if (notes.length === 0 && !canEdit) return null;

  const targetFor = (existing?: Annotation): AnnotationTarget => ({
    ref: annoRef,
    verse: null,
    wordIndex: null,
    endWordIndex: null,
    graphemeIndex: null,
    grec: lemma,
    scopeLabel: "lemme",
    existing,
  });

  return (
    <section className="mt-4 rounded-box border border-primary/30 bg-primary/5 px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[0.7rem] font-medium uppercase tracking-wide text-primary">
          Note · Biblion
        </div>
        {canEdit && (
          <button onClick={() => setEditing(targetFor())} className="btn btn-ghost btn-xs">
            Ajouter
          </button>
        )}
      </div>

      {notes.length === 0 ? (
        <p className="mt-1 text-sm text-base-content/70">Aucune note pour ce lemme.</p>
      ) : (
        <div className="mt-2 grid gap-3">
          {notes.map((n) => (
            <div key={n.id}>
              <div className="space-y-1.5 text-[0.95rem] leading-relaxed text-base-content/90">
                {n.body.split(/\n+/).filter(Boolean).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs text-base-content/70">
                {n.author?.displayName && <span className="font-greek">{n.author.displayName}</span>}
                {n.source && <span>· {n.source}</span>}
                {n.link && (
                  <a href={n.link} target="_blank" rel="noreferrer" className="link text-primary">
                    source ↗
                  </a>
                )}
                {canEdit && (
                  <button onClick={() => setEditing(targetFor(n))} className="btn btn-ghost btn-xs ml-auto">
                    Modifier
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <AnnotationEditor
          target={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
    </section>
  );
}

type LemmaData = {
  entry: LemmaEntry;
  occ: Occ[];
  dist: Distribution;
  books: NtBook[];
  colloc: Colloc[];
  corpus: CorpusConfig;
};

// Fusion « toute la Bible grecque » : livres NT et LXX sont disjoints, donc dist,
// occurrences et comptes se concatenent. Les voisins se fusionnent par lemme (n
// cumule = versets partagés des deux corpus). Le PMI n'est pas comparable entre
// corpus (tailles differentes) : on garde le max comme force d'affichage.
function combineData(nt: LemmaData, lxx: LemmaData): LemmaData {
  const ntNeighbors = new Set(nt.colloc.map((c) => c.lemma));
  const byLemma = new Map<string, Colloc>();
  for (const c of [...nt.colloc, ...lxx.colloc]) {
    const prev = byLemma.get(c.lemma);
    if (!prev) {
      byLemma.set(c.lemma, { ...c, verses: [...(c.verses ?? [])] });
      continue;
    }
    prev.n += c.n;
    prev.score = Math.max(prev.score, c.score);
    prev.verses = [...(prev.verses ?? []), ...(c.verses ?? [])];
  }
  const colloc = [...byLemma.values()]
    .map((c) => ({ ...c, hrefBase: ntNeighbors.has(c.lemma) ? NT.concordanceBase : LXX.concordanceBase }))
    .sort((a, b) => b.score - a.score || b.n - a.n)
    .slice(0, 12);
  return {
    entry: { ...nt.entry, count: nt.entry.count + lxx.entry.count },
    occ: [...nt.occ, ...lxx.occ],
    dist: { ...nt.dist, ...lxx.dist },
    books: [...nt.books, ...lxx.books],
    colloc,
    corpus: GREEK_BIBLE,
  };
}

export default function LemmaDetail({
  entry,
  occ,
  dist,
  books,
  colloc,
  corpus,
  cross,
}: LemmaData & { cross?: LemmaData }) {
  const self: LemmaData = { entry, occ, dist, books, colloc, corpus };
  const [view, setView] = useState<"nt" | "lxx" | "both">(corpus.id === "lxx" ? "lxx" : "nt");

  const nt = corpus.id === "nt" ? self : cross;
  const lxx = corpus.id === "lxx" ? self : cross;
  const both = useMemo(() => (nt && lxx ? combineData(nt, lxx) : null), [nt, lxx]);

  const shown: LemmaData = (view === "both" ? both : view === "lxx" ? lxx : nt) ?? self;

  return (
    <div className="pb-4">
      <Breadcrumb
        items={[
          { label: "Accueil", href: "/", home: true },
          { label: "Concordance", href: corpus.concordanceBase },
          { label: entry.lemma, greek: true },
        ]}
      />
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="font-greek text-3xl">{entry.lemma}</h1>
        <span className="text-sm text-base-content/70">restituée&nbsp;: {entry.translitR}</span>
        <span className="text-xs text-base-content/70">érasmien&nbsp;: {entry.translit}</span>
        <span className="text-sm text-base-content/70">· {entry.nature}</span>
      </div>
      <p className="mt-1 text-sm text-base-content/70">
        {shown.entry.count} occurrence{shown.entry.count > 1 ? "s" : ""} {shown.corpus.locative}
      </p>

      {cross && (
        <div className="join mt-3">
          <Seg active={view === "nt"} onClick={() => setView("nt")}>
            {NT.shortLabel}&nbsp;· {nt?.entry.count ?? 0}
          </Seg>
          <Seg active={view === "lxx"} onClick={() => setView("lxx")}>
            {LXX.shortLabel}&nbsp;· {lxx?.entry.count ?? 0}
          </Seg>
          <Seg active={view === "both"} onClick={() => setView("both")}>
            Les deux&nbsp;· {both?.entry.count ?? 0}
          </Seg>
        </div>
      )}

      {/* Définition d'abord (Biblion prioritaire, Bailly en repli), puis les
          annotations lemmatiques, puis répartition/voisins/occurrences. */}
      <LemmaDefinitions lemma={entry.lemma} />
      <BiblionNote lemma={entry.lemma} />

      <DistributionProfile entry={shown.entry} dist={shown.dist} books={shown.books} occ={shown.occ} corpus={shown.corpus} />
      <Collocations items={shown.colloc} occ={shown.occ} corpus={shown.corpus} />
      <Occurrences entry={shown.entry} occ={shown.occ} corpus={shown.corpus} />
    </div>
  );
}

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
