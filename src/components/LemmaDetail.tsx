"use client";

import { useMemo, useState } from "react";
import Breadcrumb from "../../app/_components/Breadcrumb";
import OccurrenceFeed, { type FeedSource } from "./concordance/OccurrenceFeed";
import BookBars from "./concordance/BookBars";
import type { KwicPage } from "@/lib/kwic";
import Collocations from "./Collocations";
import AnnotationEditor, { type AnnotationTarget } from "./AnnotationEditor";
import { useAuth } from "../hooks/useAuth";
import { useLemmaNotes } from "../hooks/useLemmaNotes";
import { useLemmaDefinition } from "../hooks/useLemmaDefinition";
import { can, type Annotation } from "../lib/api";
import type { GlossAssessment } from "../data/glosses";
import type { BaillyNotice } from "../lib/bailly";
import { LexiconSense, LexiconVia } from "./BaillyNotice";
import {
  type Colloc,
  type Distribution,
  type LemmaEntry,
  type NtBook,
  type Occ,
} from "../data/nt";
import { type CorpusConfig, NT, LXX, GREEK_BIBLE } from "../data/corpus";

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
              {(definition || hasLexicon) && (
                <p className="mt-0.5 text-xs text-base-content/60">
                  {definition ? "Dans le grec biblique" : "Lexique du grec ancien"}
                </p>
              )}
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
              <LexiconVia via={lexicon.via} />
              <LexiconSense gloss={lexicon.gloss!} notice={notice} collapsible />
            </div>
          ) : definition === undefined ? (
            <div className="mt-3 flex items-center gap-2 text-sm text-base-content/60" aria-live="polite">
              <span className="loading loading-spinner loading-xs" aria-hidden="true" />
              Chargement…
            </div>
          ) : (
            <div className="mt-3 rounded-xl bg-base-200/70 px-3.5 py-3">
              <p className="text-sm font-medium">Pas encore de sens fiable.</p>
              {canCreate && (
                <button onClick={() => setEditing(true)} className="btn btn-primary btn-sm mt-3">
                  Rédiger le sens
                </button>
              )}
            </div>
          )}

          {!definition && hasLexicon && (
            <p className="mt-3 text-xs leading-relaxed text-base-content/60">
              Sens général, à vérifier dans le contexte biblique.
            </p>
          )}
        </div>

        {definition && hasLexicon && (
          <details className="group border-t border-base-300 bg-base-200/35">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-base-content/70 marker:content-none sm:px-5">
              <span className="inline-flex items-center gap-2">
                <span className="transition-transform group-open:rotate-90" aria-hidden="true">›</span>
                Notice Bailly
              </span>
            </summary>
            <div className="border-t border-base-300 px-4 py-3 sm:px-5">
              <LexiconVia via={lexicon.via} />
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
              Source ↗
            </a>
          </div>
        )}
      </section>

      {editing && (
        <AnnotationEditor
          target={target}
          title="Définition Biblion"
          bodyLabel="Définition"
          bodyPlaceholder="Sens dans le grec biblique…"
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
        <p className="mt-1 text-sm text-base-content/70">Aucune note.</p>
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
  initial,
}: LemmaData & { cross?: LemmaData; lexicon: GlossAssessment; notice?: BaillyNotice | null; initial?: KwicPage }) {
  const self: LemmaData = { entry, occ, dist, books, colloc, corpus };
  const [view, setView] = useState<"nt" | "lxx" | "both">(cross ? "both" : corpus.id === "lxx" ? "lxx" : "nt");
  const [book, setBook] = useState<string | null>(null);
  const [senseOpen, setSenseOpen] = useState(false);

  const nt = corpus.id === "nt" ? self : cross;
  const lxx = corpus.id === "lxx" ? self : cross;
  const both = useMemo(() => (nt && lxx ? combineData(nt, lxx) : null), [nt, lxx]);
  const shown: LemmaData = (view === "both" ? both : view === "lxx" ? lxx : nt) ?? self;

  const sources = useMemo<FeedSource[]>(() => {
    const parts = view === "both" ? [nt, lxx] : [view === "lxx" ? lxx : nt];
    return parts.filter((d): d is LemmaData => !!d).map((d) => ({ corpus: d.corpus, lemma: d.entry.lemma, dist: d.dist }));
  }, [view, nt, lxx]);

  const bookCounts = shown.books
    .filter((b) => (shown.dist[b.id] ?? 0) > 0)
    .map((b) => ({ id: b.id, name: shown.corpus.bookNames[b.id] ?? b.name, count: shown.dist[b.id] }));
  const pickView = (v: typeof view) => {
    setView(v);
    setBook(null);
  };
  const filtered = book ? bookCounts.find((b) => b.id === book) : null;

  return (
    <div className="pb-4">
      <Breadcrumb
        items={[
          { label: "Accueil", href: "/", home: true },
          { label: "Concordance", href: corpus.concordanceBase },
          { label: entry.lemma, greek: true },
        ]}
      />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-greek text-4xl leading-tight">{entry.lemma}</h1>
          <p className="mt-1 text-sm text-base-content/60">
            {entry.nature} · {entry.translitR} <span className="text-base-content/40">({entry.translit})</span>
          </p>
        </div>
        {cross && (
          <div className="flex gap-1 rounded-full bg-base-200 p-1 text-sm" role="group" aria-label="Corpus">
            <Seg active={view === "both"} onClick={() => pickView("both")}>
              Tout <span className="tabular-nums opacity-60">{both?.entry.count ?? 0}</span>
            </Seg>
            <Seg active={view === "nt"} onClick={() => pickView("nt")}>
              {NT.shortLabel} <span className="tabular-nums opacity-60">{nt?.entry.count ?? 0}</span>
            </Seg>
            <Seg active={view === "lxx"} onClick={() => pickView("lxx")}>
              {LXX.shortLabel} <span className="tabular-nums opacity-60">{lxx?.entry.count ?? 0}</span>
            </Seg>
          </div>
        )}
      </header>

      <div className="mt-6 grid gap-8 wide:grid-cols-[minmax(0,1fr)_19rem] wide:grid-rows-[auto_1fr] wide:gap-10">
        <div className="min-w-0 wide:col-start-2 wide:row-start-1">
          <div className={`relative ${senseOpen ? "" : "max-h-56 overflow-hidden wide:max-h-none"}`}>
            <LemmaDefinitions lemma={entry.lemma} lexicon={lexicon} notice={notice} />
            <BiblionNote lemma={entry.lemma} />
            {!senseOpen && <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-base-100 wide:hidden" />}
          </div>
          {!senseOpen && (
            <button type="button" className="mt-2 text-sm font-medium text-primary wide:hidden" onClick={() => setSenseOpen(true)}>
              Lire la notice
            </button>
          )}
        </div>

        <div className="min-w-0 wide:col-start-1 wide:row-span-2 wide:row-start-1">
          <div id="occurrences" className="mb-3 flex scroll-mt-20 flex-wrap items-center justify-between gap-3 border-b border-base-300 pb-3">
            <h2 className="text-lg font-semibold">
              {filtered ? `${filtered.count} dans ${filtered.name}` : `${shown.entry.count} occurrence${shown.entry.count > 1 ? "s" : ""}`}
            </h2>
            <select
              aria-label="Livre"
              className="select select-bordered select-sm max-w-[14rem]"
              value={book ?? ""}
              onChange={(e) => setBook(e.target.value || null)}
            >
              <option value="">Tous les livres</option>
              {bookCounts.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.count})
                </option>
              ))}
            </select>
          </div>
          <OccurrenceFeed sources={sources} book={book} initial={initial} initialCorpus={corpus.id} />
        </div>

        <aside className="min-w-0 space-y-8 wide:col-start-2 wide:row-start-2">
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-base-content/55">Répartition</h2>
            <BookBars
              books={bookCounts}
              value={book}
              onChange={(id) => {
                setBook(id);
                document.getElementById("occurrences")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            />
          </section>
          <Collocations items={shown.colloc.slice(0, 8)} occ={shown.occ} corpus={shown.corpus} />
        </aside>
      </div>
    </div>
  );
}

function Seg({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-3 py-1 font-medium transition-colors ${active ? "bg-base-100 shadow-sm" : "text-base-content/60 hover:text-base-content"}`}
    >
      {children}
    </button>
  );
}
