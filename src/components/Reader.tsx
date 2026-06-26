"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { lengthLabel, textById, type Mot, type Text } from "../data/texts";
import { loadChapter } from "../data/nt";
import { linkedRef, parseNtRef, remapAnnotation, type PlacedAnnotation } from "../data/passageLink";
import { usePersistentState } from "../hooks/usePersistentState";
import { useAuth } from "../hooks/useAuth";
import {
  fetchAnnotations,
  deleteAnnotation,
  recordView,
  fetchPronunciations,
  type Annotation,
} from "../lib/api";
import GreekText, { type TranslitMode, type AnnoScope, type AnnoSelection } from "./GreekText";
import AnnotationEditor, { type AnnotationTarget } from "./AnnotationEditor";
import Tour, { type TourStep } from "./Tour";

const TOUR_STEPS: TourStep[] = [
  {
    title: "Bienvenue sur Anaginosko",
    body: "Le grec du Nouveau Testament, lettre par lettre. Trois repères pour commencer.",
  },
  {
    target: ".glyph",
    body: "Touchez une lettre pour découvrir son nom et sa prononciation, érasmienne et restituée.",
  },
  {
    target: 'button[aria-controls="reader-settings"]',
    body: "Réglez l’affichage ici : écriture, prononciation, traduction et taille du texte.",
  },
  {
    target: 'a[href="/concordance"]',
    body: "Cherchez un mot grec dans tout le Nouveau Testament depuis la concordance.",
  },
];

function SlidersIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h10M18 18h2" />
      <circle cx="16" cy="6" r="2" fill="currentColor" stroke="none" />
      <circle cx="8" cy="12" r="2" fill="currentColor" stroke="none" />
      <circle cx="16" cy="18" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

type Sel = { anchorW: number; headW: number; g: number; char: string; scope: AnnoScope };

const SCOPES: { id: AnnoScope; label: string }[] = [
  { id: "char", label: "Caractère" },
  { id: "word", label: "Mot" },
  { id: "phrase", label: "Phrase" },
];

// Groupe de contrôle avec un mini label au-dessus.
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex w-full flex-col gap-1">
      <span className="px-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-base-content/45">
        {label}
      </span>
      {children}
    </div>
  );
}

function Seg({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`btn join-item btn-sm sm:btn-md flex-1 whitespace-nowrap px-2 ${active ? "btn-primary" : "btn-outline border-base-300"}`}
    >
      {children}
    </button>
  );
}

export default function Reader({ text }: { text: Text }) {
  // Mot à surligner (?w=) lu côté client après hydratation, pour ne pas rendre
  // la page dynamique ni casser le SSG du texte grec.
  const [highlight, setHighlight] = useState<number | null>(null);
  useEffect(() => {
    const w = new URLSearchParams(window.location.search).get("w");
    setHighlight(w ? Number(w) : null);
  }, []);

  // En mode passage, traduction et annotations sont masquées par défaut (clés de
  // préférence distinctes du mode NT, pour que chaque mode garde son réglage).
  const isPassage = text.collection === "passages";
  const [manuscript, setManuscript] = usePersistentState<boolean>("anaginosko:manuscript", false);
  const [mode, setMode] = usePersistentState<TranslitMode>("anaginosko:translit", "off");
  const [translation, setTranslation] = usePersistentState<"off" | "verses" | "columns">(
    isPassage ? "anaginosko:translation:passage" : "anaginosko:translation",
    "off",
  );
  const [showAnnotations, setShowAnnotations] = usePersistentState<boolean>(
    isPassage ? "anaginosko:annotations:passage" : "anaginosko:annotations",
    isPassage ? false : true,
  );
  const [textScale, setTextScale] = usePersistentState<number>("anaginosko:textScale", 1);
  const adjustScale = (d: number) =>
    setTextScale((s) => Math.min(1.6, Math.max(0.8, Math.round((s + d) * 100) / 100)));

  // Panneau de réglages d'affichage, replié par défaut (US-1).
  const [settingsOpen, setSettingsOpen] = useState(false);
  useEffect(() => {
    if (!settingsOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSettingsOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [settingsOpen]);

  // Tutoriel guidé, montré une seule fois (US-2).
  const [tipSeen, setTipSeen] = usePersistentState<boolean>("anaginosko:tour:v1", false);

  const { user } = useAuth();
  const canAnnotate = user?.role === "philologist" || user?.role === "admin";
  const [annotateMode, setAnnotateMode] = useState(false);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  // Annotations du texte lié (passage ↔ chapitre NT), remappées sur ce texte.
  const [foreign, setForeign] = useState<PlacedAnnotation[]>([]);
  const [sel, setSel] = useState<Sel | null>(null);
  const [editTarget, setEditTarget] = useState<AnnotationTarget | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Annotation | null>(null);
  // Overrides de prononciation (par forme) -> translittération affichée dans
  // l'interlinéaire, cohérente avec la fiche du mot.
  const [pronOverrides, setPronOverrides] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    fetchPronunciations()
      .then((rows) => {
        const m = new Map<string, string>();
        for (const o of rows) if (o.translit) m.set(`${o.grec}:${o.system}`, o.translit);
        setPronOverrides(m);
      })
      .catch(() => {});
  }, []);

  const ref = text.id;
  const mots = text.mots;
  const motGrec = (w: number) => mots?.[Math.floor(w / 2)]?.grec ?? "";

  const loadAnnotations = useCallback(
    () => fetchAnnotations(ref).then(setAnnotations).catch(() => setAnnotations([])),
    [ref],
  );

  const loadForeign = useCallback(async () => {
    setForeign([]);
    const lref = linkedRef(ref);
    if (!lref || !mots) return;
    try {
      const nt = parseNtRef(lref);
      const srcMots: Mot[] | null = nt
        ? (await loadChapter(nt.book, nt.chapter)).mots
        : (textById(lref)?.mots ?? null);
      if (!srcMots) return;
      const anns = await fetchAnnotations(lref);
      setForeign(
        anns
          .map((a) => remapAnnotation(a, srcMots, mots))
          .filter((p): p is PlacedAnnotation => p !== null),
      );
    } catch {
      /* lien indisponible : on garde les annotations natives seules */
    }
  }, [ref, mots]);

  const reload = useCallback(() => {
    loadAnnotations();
    loadForeign();
  }, [loadAnnotations, loadForeign]);

  useEffect(() => {
    loadAnnotations();
    loadForeign();
    recordView(ref);
  }, [ref, loadAnnotations, loadForeign]);

  // Quitter le mode annotation efface la sélection en cours.
  useEffect(() => {
    if (!annotateMode) setSel(null);
  }, [annotateMode]);

  const canManage = (a: Annotation) =>
    !!user && (user.role === "admin" || (a.userId != null && a.userId === user.id));

  // Cartes de rendu : soulignement mot/phrase, soulignement caractère, pastilles.
  // Les annotations liées (passage ↔ NT) sont placées à leurs coords remappées,
  // mais gardent leur enregistrement d'origine pour l'édition/suppression.
  const { maps, displayById } = useMemo(() => {
    const displayById = new Map<number, { w: number; end: number | null }>();
    if (!showAnnotations) return { maps: null, displayById };
    const spanWords = new Map<number, Annotation[]>();
    const charSpots = new Map<string, Annotation[]>();
    const markers = new Map<number, Annotation[]>();
    const push = <K,>(m: Map<K, Annotation[]>, k: K, a: Annotation) =>
      m.set(k, [...(m.get(k) ?? []), a]);
    const place = (a: Annotation, w: number, end: number | null, g: number | null) => {
      displayById.set(a.id, { w, end });
      if (g != null) {
        push(charSpots, `${w}:${g}`, a);
        push(markers, w, a);
      } else if (end != null) {
        for (let x = w; x <= end; x += 2) push(spanWords, x, a);
        push(markers, end, a);
      } else {
        push(spanWords, w, a);
        push(markers, w, a);
      }
    };
    for (const a of annotations) {
      if (a.wordIndex == null) continue;
      place(a, a.wordIndex, a.endWordIndex, a.graphemeIndex);
    }
    for (const p of foreign) place(p.a, p.w, p.end, p.g);
    return { maps: { spanWords, charSpots, markers }, displayById };
  }, [annotations, foreign, showAnnotations]);

  const onSelectLetter = (w: number, g: number, cluster: string) => {
    setSel((prev) => {
      if (!prev) return { anchorW: w, headW: w, g, char: cluster, scope: "word" };
      if (prev.scope === "phrase") return { ...prev, headW: w };
      return { anchorW: w, headW: w, g, char: cluster, scope: prev.scope };
    });
  };

  const setScope = (scope: AnnoScope) =>
    setSel((prev) => (prev ? { ...prev, scope, headW: scope === "phrase" ? prev.headW : prev.anchorW } : prev));

  const selection: AnnoSelection = sel
    ? { from: sel.anchorW, to: sel.headW, g: sel.g, scope: sel.scope }
    : null;

  const openEditorFromSelection = () => {
    if (!sel) return;
    const from = Math.min(sel.anchorW, sel.headW);
    const to = Math.max(sel.anchorW, sel.headW);
    let grec: string, wordIndex: number, endWordIndex: number | null, graphemeIndex: number | null, scopeLabel: string;
    if (sel.scope === "char") {
      grec = sel.char || motGrec(sel.anchorW);
      wordIndex = sel.anchorW;
      endWordIndex = null;
      graphemeIndex = sel.g;
      scopeLabel = "caractère";
    } else if (sel.scope === "word") {
      grec = motGrec(sel.anchorW);
      wordIndex = sel.anchorW;
      endWordIndex = null;
      graphemeIndex = null;
      scopeLabel = "mot";
    } else {
      const parts: string[] = [];
      for (let w = from; w <= to; w += 2) parts.push(motGrec(w));
      grec = parts.join(" ");
      wordIndex = from;
      endWordIndex = to;
      graphemeIndex = null;
      scopeLabel = "phrase";
    }
    setEditTarget({
      ref,
      verse: text.mots?.[Math.floor(wordIndex / 2)]?.verse ?? null,
      wordIndex,
      endWordIndex,
      graphemeIndex,
      grec,
      scopeLabel,
    });
  };

  const openEditorForExisting = (a: Annotation) => {
    // Mot affiché dans CE texte (remappé si annotation liée), pour le grec.
    const disp = displayById.get(a.id);
    const from = disp?.w ?? a.wordIndex ?? 0;
    const to = disp?.end ?? from;
    const parts: string[] = [];
    for (let w = from; w <= to; w += 2) parts.push(motGrec(w));
    const scopeLabel = a.graphemeIndex != null ? "caractère" : a.endWordIndex != null ? "phrase" : "mot";
    // ref/wordIndex d'ORIGINE pour la mise à jour : ne déplace pas l'annotation.
    setEditTarget({
      ref: a.ref,
      verse: a.verse,
      wordIndex: a.wordIndex ?? 0,
      endWordIndex: a.endWordIndex,
      graphemeIndex: a.graphemeIndex,
      grec: parts.join(" ") || motGrec(from),
      scopeLabel,
      existing: a,
    });
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteAnnotation(pendingDelete.id);
    } catch {
      /* ignore */
    }
    setPendingDelete(null);
    reload();
  };

  const hasErasmien = !!text.translitErasmien || !!text.mots?.[0]?.erasmien;
  const hasRestituee = !!text.translitRestituee || !!text.mots?.[0]?.restituee;
  const french = text.francais;
  const hasFrench = !!french && Object.keys(french).length > 0;
  const verses = hasFrench ? Object.keys(french!).map(Number).sort((a, b) => a - b) : [];
  const transMode = hasFrench ? translation : "off";

  const greekProps = {
    spanWords: maps?.spanWords,
    charSpots: maps?.charSpots,
    markers: maps?.markers,
    annotateMode,
    selection,
    onSelectLetter,
    canManage,
    onEditAnnotation: openEditorForExisting,
    onDeleteAnnotation: (a: Annotation) => setPendingDelete(a),
    pronOverrides,
  };

  const selGrec = sel
    ? sel.scope === "char"
      ? sel.char
      : sel.scope === "word"
        ? motGrec(sel.anchorW)
        : (() => {
            const from = Math.min(sel.anchorW, sel.headW);
            const to = Math.max(sel.anchorW, sel.headW);
            const parts: string[] = [];
            for (let w = from; w <= to; w += 2) parts.push(motGrec(w));
            return parts.join(" ");
          })()
    : "";
  const phraseNeedsEnd = sel?.scope === "phrase" && sel.anchorW === sel.headW;

  return (
    <article className="pt-5">
      <div className="flex items-center gap-2 text-sm text-base-content/70">
        <span className="badge badge-sm badge-ghost">{lengthLabel(text)}</span>
        <span>{annotateMode ? "Touchez le texte pour sélectionner" : "Touchez une lettre pour ses indices"}</span>
      </div>

      {!settingsOpen && !annotateMode && (
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={settingsOpen}
          aria-controls="reader-settings"
          className="btn btn-sm fixed right-3 bottom-[calc(4.6rem+env(safe-area-inset-bottom))] z-30 gap-1.5 rounded-full border-base-300 bg-base-100/95 shadow-md backdrop-blur-md wide:top-20 wide:right-4 wide:bottom-auto"
        >
          <SlidersIcon />
          <span className="font-medium">Affichage</span>
        </button>
      )}

      <div
        id="reader-settings"
        role="dialog"
        aria-modal="true"
        aria-label="Réglages d’affichage"
        className={`fixed inset-0 z-50 ${settingsOpen ? "" : "hidden"}`}
      >
        <div
          className="absolute inset-0 bg-black/40 wide:bg-transparent"
          onClick={() => setSettingsOpen(false)}
          aria-hidden="true"
        />
        <div className="absolute inset-x-0 bottom-0 max-h-[82dvh] overflow-y-auto rounded-t-2xl border-t border-base-300 bg-base-100 p-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl wide:inset-x-auto wide:top-20 wide:right-4 wide:bottom-auto wide:max-h-[calc(100dvh-7rem)] wide:w-80 wide:rounded-2xl wide:border wide:border-base-300 wide:p-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Affichage</h2>
            <button
              onClick={() => setSettingsOpen(false)}
              aria-label="Fermer"
              className="btn btn-ghost btn-sm btn-circle"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <div className="flex flex-col gap-3">
        <Field label="Écriture">
          <div className="join w-full">
            <Seg active={!manuscript} onClick={() => setManuscript(false)}>
              Minuscules
            </Seg>
            <Seg active={manuscript} onClick={() => setManuscript(true)}>
              Manuscrit
            </Seg>
          </div>
        </Field>

        {(hasErasmien || hasRestituee) && (
          <Field label="Prononciation">
            <div className="join w-full">
              <Seg active={mode === "off"} onClick={() => setMode("off")}>
                Aucune
              </Seg>
              {hasErasmien && (
                <Seg active={mode === "erasmien"} onClick={() => setMode("erasmien")}>
                  Érasmien
                </Seg>
              )}
              {hasRestituee && (
                <Seg active={mode === "restituee"} onClick={() => setMode("restituee")}>
                  Restituée
                </Seg>
              )}
            </div>
          </Field>
        )}

        {hasFrench && (
          <Field label="Traduction">
            <div className="join w-full" role="group" aria-label="Traduction">
              {(
                [
                  ["off", "Aucune"],
                  ["verses", "Versets"],
                  ["columns", "Colonnes"],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setTranslation(val)}
                  aria-pressed={translation === val}
                  className={`btn join-item btn-sm sm:btn-md flex-1 whitespace-nowrap px-2 ${translation === val ? "btn-primary" : "btn-outline border-base-300"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>
        )}

        <Field label="Annotations">
          <div className="flex flex-col gap-2">
            <div className="join w-full">
              <Seg active={!showAnnotations} onClick={() => setShowAnnotations(false)}>
                Cacher
              </Seg>
              <Seg active={showAnnotations} onClick={() => setShowAnnotations(true)}>
                Afficher
              </Seg>
            </div>
            {canAnnotate && (
              <button
                onClick={() => setAnnotateMode((v) => !v)}
                aria-pressed={annotateMode}
                className={`btn btn-sm sm:btn-md w-full ${annotateMode ? "btn-accent" : "btn-outline border-base-300"}`}
              >
                {annotateMode ? "Quitter l’annotation" : "Annoter"}
              </button>
            )}
          </div>
        </Field>

        <Field label="Taille">
          <div className="join w-full" role="group" aria-label="Taille du texte">
            <button
              onClick={() => adjustScale(-0.1)}
              disabled={textScale <= 0.8}
              aria-label="Réduire la taille du texte"
              className="btn join-item btn-sm sm:btn-md btn-outline border-base-300 flex-1"
            >
              <span className="text-xs font-semibold">A</span>
            </button>
            <button
              onClick={() => setTextScale(1)}
              aria-label="Taille par défaut"
              className="btn join-item btn-sm sm:btn-md btn-outline border-base-300 tabular-nums text-xs flex-1"
            >
              {Math.round(textScale * 100)}%
            </button>
            <button
              onClick={() => adjustScale(0.1)}
              disabled={textScale >= 1.6}
              aria-label="Agrandir la taille du texte"
              className="btn join-item btn-sm sm:btn-md btn-outline border-base-300 flex-1"
            >
              <span className="text-lg font-semibold">A</span>
            </button>
          </div>
        </Field>

            <button
              type="button"
              onClick={() => {
                setTipSeen(false);
                setSettingsOpen(false);
              }}
              className="mt-1 self-start text-xs font-medium text-base-content/55 underline-offset-2 hover:underline"
            >
              Revoir le tutoriel
            </button>
          </div>
        </div>
      </div>

      {transMode === "off" ? (
        <div className="mt-5">
          <GreekText text={text} size="lg" scale={textScale} translit={mode} manuscript={manuscript} highlightWord={highlight} {...greekProps} />
        </div>
      ) : transMode === "verses" ? (
        <div className="mt-5">
          {verses.map((v) => (
            <div key={v} className="border-b border-base-300/70 py-4 first:pt-0 last:border-0">
              <GreekText
                text={text}
                size="lg"
                scale={textScale}
                translit={mode}
                manuscript={manuscript}
                verseOnly={v}
                highlightWord={highlight}
                {...greekProps}
              />
              <p className="mt-2 leading-relaxed text-base-content/85">
                <span className="verse-num">{v}</span>
                {french![v]}
              </p>
            </div>
          ))}
          <p className="mt-3 text-xs text-base-content/50">
            Traduction : Bible Crampon (néo-Crampon, domaine public).
          </p>
        </div>
      ) : (
        // Côte à côte : grec | français, alignés par verset.
        <div className="mt-5 grid grid-cols-[1.15fr_1fr] gap-x-3 sm:gap-x-6">
          {verses.map((v) => (
            <Fragment key={v}>
              <div className="border-b border-base-300/70 py-3">
                <GreekText
                  text={text}
                  size="lg"
                  scale={textScale}
                  translit={mode}
                  manuscript={manuscript}
                  verseOnly={v}
                  highlightWord={highlight}
                  {...greekProps}
                />
              </div>
              <div className="border-b border-base-300/70 py-3 leading-relaxed text-base-content/85">
                <span className="verse-num">{v}</span>
                {french![v]}
              </div>
            </Fragment>
          ))}
          <p className="col-span-2 mt-3 text-xs text-base-content/50">
            Traduction : Bible Crampon (néo-Crampon, domaine public).
          </p>
        </div>
      )}

      <Tour
        active={!tipSeen && !settingsOpen && !annotateMode}
        steps={TOUR_STEPS}
        onDone={() => setTipSeen(true)}
      />

      {annotateMode && (
        <div className="fixed inset-x-0 bottom-[calc(4.2rem+env(safe-area-inset-bottom))] z-40 px-3 wide:bottom-6 wide:left-auto wide:right-4 wide:px-0">
          <div className="mx-auto max-w-md rounded-2xl border border-base-300 bg-base-100/95 p-3 shadow-2xl backdrop-blur-md wide:w-80">
            {sel ? (
              <>
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <span className="truncate font-greek text-lg text-primary">{selGrec}</span>
                  <button onClick={() => setSel(null)} className="btn btn-ghost btn-xs shrink-0">
                    Effacer
                  </button>
                </div>
                <div className="join w-full">
                  {SCOPES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setScope(s.id)}
                      aria-pressed={sel.scope === s.id}
                      className={`btn join-item btn-sm flex-1 ${sel.scope === s.id ? "btn-primary" : "btn-outline border-base-300"}`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={openEditorFromSelection}
                  disabled={phraseNeedsEnd}
                  className="btn btn-accent btn-sm mt-2 w-full"
                >
                  {phraseNeedsEnd ? "Touchez le dernier mot…" : "Annoter"}
                </button>
              </>
            ) : (
              <p className="text-center text-sm text-base-content/70">
                Touchez une lettre pour annoter le <strong>mot</strong> ; ajustez ensuite la portée
                (caractère, mot, phrase).
              </p>
            )}
          </div>
        </div>
      )}

      {editTarget && (
        <AnnotationEditor
          target={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            setEditTarget(null);
            setSel(null);
            reload();
          }}
        />
      )}

      {pendingDelete &&
        createPortal(
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={() => setPendingDelete(null)} aria-hidden="true" />
            <div role="dialog" aria-label="Confirmer la suppression" className="relative w-full max-w-xs rounded-2xl border border-base-300 bg-base-100 p-5 shadow-2xl">
              <p className="text-sm">Supprimer cette annotation&nbsp;?</p>
              <p className="mt-1 line-clamp-3 text-xs text-base-content/55">{pendingDelete.body}</p>
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => setPendingDelete(null)} className="btn btn-ghost btn-sm">
                  Annuler
                </button>
                <button onClick={confirmDelete} className="btn btn-error btn-sm">
                  Supprimer
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </article>
  );
}
