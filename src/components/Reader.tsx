import { useEffect, useMemo, useState } from "react";
import { lengthLabel, type Text } from "../data/texts";
import { usePersistentState } from "../hooks/usePersistentState";
import { useAuth } from "../hooks/useAuth";
import { fetchAnnotations, recordView, type Annotation } from "../lib/api";
import GreekText, { type TranslitMode } from "./GreekText";
import AnnotationEditor, { type AnnotationTarget } from "./AnnotationEditor";

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
  const [manuscript, setManuscript] = usePersistentState<boolean>("anaginosko:manuscript", false);
  const [mode, setMode] = usePersistentState<TranslitMode>("anaginosko:translit", "off");
  const [showFr, setShowFr] = usePersistentState<boolean>("anaginosko:french", false);
  const [showAnnotations, setShowAnnotations] = usePersistentState<boolean>("anaginosko:annotations", true);

  const { user } = useAuth();
  const canAnnotate = user?.role === "philologist" || user?.role === "admin";
  const [annotateMode, setAnnotateMode] = useState(false);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [editTarget, setEditTarget] = useState<AnnotationTarget | null>(null);

  const ref = text.id;

  const loadAnnotations = useMemo(
    () => () => fetchAnnotations(ref).then(setAnnotations).catch(() => setAnnotations([])),
    [ref],
  );

  useEffect(() => {
    loadAnnotations();
    recordView(ref);
  }, [ref, loadAnnotations]);

  // Index de jeton -> annotations.
  const annotatedWords = useMemo(() => {
    if (!showAnnotations) return undefined;
    const map = new Map<number, Annotation[]>();
    for (const a of annotations) {
      if (a.wordIndex == null) continue;
      const arr = map.get(a.wordIndex) ?? [];
      arr.push(a);
      map.set(a.wordIndex, arr);
    }
    return map;
  }, [annotations, showAnnotations]);

  const onAnnotate = (wordIndex: number, graphemeIndex: number) => {
    const mot = text.mots?.[Math.floor(wordIndex / 2)];
    setEditTarget({
      ref,
      wordIndex,
      graphemeIndex,
      verse: mot?.verse ?? null,
      grec: mot?.grec ?? "",
    });
  };

  const hasErasmien = !!text.translitErasmien || !!text.mots?.[0]?.erasmien;
  const hasRestituee = !!text.translitRestituee || !!text.mots?.[0]?.restituee;
  const french = text.francais;
  const hasFrench = !!french && Object.keys(french).length > 0;
  const verses = hasFrench ? Object.keys(french!).map(Number).sort((a, b) => a - b) : [];
  const study = showFr && hasFrench;

  const greekProps = {
    annotatedWords,
    annotateMode,
    onAnnotate,
  };

  return (
    <article className="pt-5">
      <div className="flex items-center gap-2 text-sm text-base-content/70">
        <span className="badge badge-sm badge-ghost">{lengthLabel(text)}</span>
        <span>{annotateMode ? "Cliquez un mot pour l’annoter" : "Touchez une lettre pour ses indices"}</span>
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

      {editTarget && (
        <AnnotationEditor
          target={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            setEditTarget(null);
            loadAnnotations();
          }}
        />
      )}
    </article>
  );
}
