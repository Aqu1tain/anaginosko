import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { lengthLabel, textById, type Mot, type Text } from "../data/texts";
import { loadChapter } from "../data/nt";
import { linkedRef, parseNtRef, remapAnnotation, type PlacedAnnotation } from "../data/passageLink";
import { usePersistentState } from "../hooks/usePersistentState";
import { useAuth } from "../hooks/useAuth";
import { fetchAnnotations, deleteAnnotation, recordView, type Annotation } from "../lib/api";
import GreekText, { type TranslitMode, type AnnoScope, type AnnoSelection } from "./GreekText";
import AnnotationEditor, { type AnnotationTarget } from "./AnnotationEditor";

type Sel = { anchorW: number; headW: number; g: number; char: string; scope: AnnoScope };

const SCOPES: { id: AnnoScope; label: string }[] = [
  { id: "char", label: "Caractère" },
  { id: "word", label: "Mot" },
  { id: "phrase", label: "Phrase" },
];

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
      className={`btn join-item btn-sm sm:btn-md wide:flex-1 ${active ? "btn-primary" : "btn-outline border-base-300"}`}
    >
      {children}
    </button>
  );
}

export default function Reader({ text, highlight }: { text: Text; highlight: number | null }) {
  // En mode passage, traduction et annotations sont masquées par défaut (clés de
  // préférence distinctes du mode NT, pour que chaque mode garde son réglage).
  const isPassage = text.collection === "passages";
  const [manuscript, setManuscript] = usePersistentState<boolean>("anaginosko:manuscript", false);
  const [mode, setMode] = usePersistentState<TranslitMode>("anaginosko:translit", "off");
  const [showFr, setShowFr] = usePersistentState<boolean>(
    isPassage ? "anaginosko:french:passage" : "anaginosko:french",
    false,
  );
  const [showAnnotations, setShowAnnotations] = usePersistentState<boolean>(
    isPassage ? "anaginosko:annotations:passage" : "anaginosko:annotations",
    isPassage ? false : true,
  );

  const { user } = useAuth();
  const canAnnotate = user?.role === "philologist" || user?.role === "admin";
  const [annotateMode, setAnnotateMode] = useState(false);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  // Annotations du texte lié (passage ↔ chapitre NT), remappées sur ce texte.
  const [foreign, setForeign] = useState<PlacedAnnotation[]>([]);
  const [sel, setSel] = useState<Sel | null>(null);
  const [editTarget, setEditTarget] = useState<AnnotationTarget | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Annotation | null>(null);

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
  const study = showFr && hasFrench;

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

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 wide:fixed wide:top-20 wide:right-4 wide:z-30 wide:mt-0 wide:w-72 wide:flex-col wide:items-stretch wide:gap-2 wide:rounded-2xl wide:border wide:border-base-300 wide:bg-base-100/90 wide:p-3 wide:shadow-sm wide:backdrop-blur-md">
        <div className="join wide:w-full">
          <Seg active={!manuscript} onClick={() => setManuscript(false)}>
            Minuscules
          </Seg>
          <Seg active={manuscript} onClick={() => setManuscript(true)}>
            Manuscrit
          </Seg>
        </div>

        {(hasErasmien || hasRestituee) && (
          <div className="join wide:w-full">
            <Seg active={mode === "off"} onClick={() => setMode("off")}>
              Grec
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
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 wide:flex-col wide:items-start">
          {hasFrench && (
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showFr}
                onChange={(e) => setShowFr(e.target.checked)}
                className="toggle toggle-sm toggle-primary"
              />
              <span>Traduction</span>
            </label>
          )}
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showAnnotations}
              onChange={(e) => setShowAnnotations(e.target.checked)}
              className="toggle toggle-sm toggle-primary"
            />
            <span>Annotations</span>
          </label>
          {canAnnotate && (
            <button
              onClick={() => setAnnotateMode((v) => !v)}
              aria-pressed={annotateMode}
              className={`btn btn-sm ${annotateMode ? "btn-accent" : "btn-outline border-base-300"}`}
            >
              {annotateMode ? "Quitter l’annotation" : "Annoter"}
            </button>
          )}
        </div>
      </div>

      {study ? (
        <div className="mt-5">
          {verses.map((v) => (
            <div key={v} className="border-b border-base-300/70 py-4 first:pt-0 last:border-0">
              <GreekText
                text={text}
                size="lg"
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
        <div className="mt-5">
          <GreekText text={text} size="lg" translit={mode} manuscript={manuscript} highlightWord={highlight} {...greekProps} />
        </div>
      )}

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
