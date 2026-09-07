"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Breadcrumb from "../../app/_components/Breadcrumb";
import DistributionProfile from "./DistributionProfile";
import Collocations from "./Collocations";
import AnnotationEditor, { type AnnotationTarget } from "./AnnotationEditor";
import { useAuth } from "../hooks/useAuth";
import { useLemmaNotes } from "../hooks/useLemmaNotes";
import { useLemmaDefinition } from "../hooks/useLemmaDefinition";
import { can, type Annotation } from "../lib/api";
import type { GlossAssessment } from "../data/glosses";
import type { BaillyNotice } from "../lib/bailly";
import { LexiconSense } from "./BaillyNotice";
import {
  type Colloc,
  type Distribution,
  type LemmaEntry,
  type NtBook,
  type Occ,
} from "../data/nt";
import { type CorpusConfig, NT, LXX, GREEK_BIBLE } from "../data/corpus";

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
function LemmaDefinitions({ lemma, lexicon, notice }: { lemma: string; lexicon: GlossAssessment; notice?: BaillyNotice | null }) {
  const { user } = useAuth();
  const { definition, reload } = useLemmaDefinition(lemma);
  const [editing, setEditing] = useState(false);
  const hasLexicon = lexicon.status === "verified" && !!lexicon.gloss;
  const canCreate = can(user, "annotations") && definition === null;
  const canEdit = !!definition && (
    can(user, "moderate") || (can(user, "annotations") && definition.userId === user?.id)
  );

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
      <section className="mt-4 overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-sm">
        <div className="border-l-4 border-primary px-4 py-4 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-primary">
                Sens du lemme
              </div>
              <p className="mt-0.5 text-xs text-base-content/60">
                {definition ? "Dans le grec biblique" : hasLexicon ? "Repère lexicographique général" : "État éditorial"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <span className={`badge badge-sm ${definition ? "badge-primary" : hasLexicon ? "badge-ghost" : "badge-warning badge-soft"}`}>
                {definition ? "Biblion" : hasLexicon ? "Bailly" : "À documenter"}
              </span>
              {canEdit && (
                <button onClick={() => setEditing(true)} className="btn btn-ghost btn-xs">
                  Modifier
                </button>
              )}
            </div>
          </div>

          {definition ? (
            <>
              <div className="mt-3 space-y-2 text-base leading-relaxed text-base-content/90">
              {definition.body.split(/\n+/).filter(Boolean).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
              </div>
              {(definition.author?.displayName || definition.source || definition.link) && (
                <div className="mt-3 flex flex-wrap items-center gap-x-2 text-xs text-base-content/60">
                  {definition.author?.displayName && <span>{definition.author.displayName}</span>}
                  {definition.source && <span>· {definition.source}</span>}
                {definition.link && (
                  <a href={definition.link} target="_blank" rel="noreferrer" className="link text-primary">
                    source ↗
                  </a>
                )}
                </div>
              )}
            </>
          ) : hasLexicon ? (
            <div className="mt-3">
              <LexiconSense gloss={lexicon.gloss!} notice={notice} collapsible />
            </div>
          ) : definition === undefined ? (
            <div className="mt-3 flex items-center gap-2 text-sm text-base-content/60" aria-live="polite">
              <span className="loading loading-spinner loading-xs" aria-hidden="true" />
              Recherche d’un sens révisé…
            </div>
          ) : (
            <div className="mt-3 rounded-xl bg-base-200/70 px-3.5 py-3">
              <p className="text-sm font-medium">Aucun sens fiable n’est encore publié.</p>
              <p className="mt-1 text-sm leading-relaxed text-base-content/65">
                Une notice approximative n’est pas affichée comme une définition. Les occurrences ci-dessous restent disponibles pour étudier le mot en contexte.
              </p>
              {canCreate && (
                <button onClick={() => setEditing(true)} className="btn btn-primary btn-sm mt-3">
                  Rédiger le sens Biblion
                </button>
              )}
            </div>
          )}

          {!definition && hasLexicon && (
            <p className="mt-3 text-xs leading-relaxed text-base-content/60">
              Source générale non spécialisée dans le grec biblique. Le sens peut varier selon le contexte.
            </p>
          )}
        </div>

        {definition && hasLexicon && (
          <details className="group border-t border-base-300 bg-base-200/35">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-base-content/70 marker:content-none sm:px-5">
              <span className="inline-flex items-center gap-2">
                <span className="transition-transform group-open:rotate-90" aria-hidden="true">›</span>
                Consulter aussi la notice Bailly
              </span>
            </summary>
            <div className="border-t border-base-300 px-4 py-3 sm:px-5">
              <LexiconSense gloss={lexicon.gloss!} notice={notice} collapsible />
            </div>
          </details>
        )}

        {hasLexicon && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-base-300 px-4 py-2.5 text-xs text-base-content/60 sm:px-5">
            <span>Bailly 2020 · CC BY-NC-ND</span>
            <a
              href={`https://bailly.app/${encodeURIComponent(lexicon.gloss!.uri)}`}
              target="_blank"
              rel="noreferrer"
              className="link hover:text-primary"
            >
              Ouvrir la source ↗
            </a>
          </div>
        )}
      </section>

      {editing && (
        <AnnotationEditor
          target={target}
          title="Définition Biblion"
          bodyLabel="Définition"
          bodyPlaceholder="Sens du mot dans le grec biblique, quand Bailly est imprécis ou absent…"
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
  const canEdit = can(user, "annotations");
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
  lexicon,
  notice,
}: LemmaData & { cross?: LemmaData; lexicon: GlossAssessment; notice?: BaillyNotice | null }) {
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

      <LemmaDefinitions lemma={entry.lemma} lexicon={lexicon} notice={notice} />
      <BiblionNote lemma={entry.lemma} />

      <section className="mt-6 border-t border-base-300 pt-5" aria-labelledby="occurrence-scope">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="occurrence-scope" className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-base-content/60">
              Explorer les occurrences
            </h2>
            <p className="mt-1 text-sm text-base-content/70">
              {shown.entry.count} occurrence{shown.entry.count > 1 ? "s" : ""} {shown.corpus.locative}
            </p>
          </div>
          {cross && (
            <div className="join" role="group" aria-label="Filtrer les occurrences par corpus">
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
        </div>
      </section>

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
