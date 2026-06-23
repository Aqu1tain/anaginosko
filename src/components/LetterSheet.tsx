import { useEffect, useRef } from "react";
import { accentLabel, breathingLabel, type GraphemeInfo } from "../lib/greek";
import type { SheetStage } from "./SheetContext";
import type { WordContext } from "../lib/tokenize";
import { glossFor } from "../data/glosses";
import { speakTranslit, speechSupported } from "../lib/audio";
import Translit from "./Translit";

function SpeakButton({ value }: { value: string }) {
  if (!speechSupported()) return null;
  return (
    <button
      onClick={() => speakTranslit(value)}
      aria-label="Écouter la prononciation"
      className="btn btn-ghost btn-xs btn-circle text-accent"
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
        <path
          d="M16.5 8.5a4 4 0 010 7M19 6a7 7 0 010 12"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}

function Pron({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 rounded-box bg-base-200 px-3 py-2.5">
      <div className="text-[0.7rem] font-medium uppercase tracking-wide text-base-content/55">
        {label}
      </div>
      <div className="mt-0.5 text-lg font-medium">{value}</div>
    </div>
  );
}

export default function LetterSheet({
  info,
  word,
  stage,
  onClose,
}: {
  info: GraphemeInfo;
  word: WordContext | null;
  stage: SheetStage;
  onClose: () => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const letter = info.letter;

  // Feuille non bloquante : les lettres restent cliquables (pour enchaîner les
  // clics). On ferme via Échap ou un clic en dehors, sauf sur une lettre, qui
  // pilote elle-même le cycle.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      if (boxRef.current?.contains(t)) return;
      if (t.closest(".glyph")) return;
      onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [onClose]);

  if (!letter) return null;

  const chips = [
    breathingLabel(info.breathing),
    accentLabel(info.accent),
    info.iotaSubscript ? "Iota souscrit" : null,
    info.isFinalSigma ? "Sigma final (ς)" : null,
  ].filter((c): c is string => c !== null);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center">
      <div
        ref={boxRef}
        role="dialog"
        aria-label={`Lettre ${letter.name}`}
        className="animate-sheet pointer-events-auto w-full max-w-md rounded-t-2xl border border-base-300 bg-base-100 px-5 pt-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl"
      >
        <div className="flex items-center gap-4">
          <div className="font-greek flex h-16 w-16 shrink-0 items-center justify-center rounded-box bg-accent/15 text-4xl text-accent">
            {info.cluster}
          </div>
          <div className="min-w-0">
            <div className="text-xl font-semibold">{letter.name}</div>
            <div className="font-greek text-base text-base-content/60">
              {letter.upper} {letter.lower}
              {letter.final ? ` ${letter.final}` : ""}
              <span className="font-sans"> · « {letter.latin} »</span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="btn btn-ghost btn-circle ml-auto shrink-0"
          >
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="mt-4 flex gap-2.5">
          <Pron label="Érasmien" value={letter.erasmien} />
          <Pron label="Restituée" value={letter.restituee} />
        </div>

        {letter.note && (
          <p className="mt-3 text-sm leading-relaxed text-base-content/70">{letter.note}</p>
        )}

        {chips.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {chips.map((c) => (
              <span key={c} className="badge badge-sm badge-ghost">
                {c}
              </span>
            ))}
          </div>
        )}

        {stage === 1 && word && (
          <p className="mt-4 border-t border-base-300 pt-3 text-sm text-base-content/55">
            Touchez encore la lettre pour voir le mot complet →
          </p>
        )}

        {stage === 2 && word && (
          <div className="mt-4 border-t border-base-300 pt-4">
            <div className="text-[0.7rem] font-medium uppercase tracking-wide text-base-content/55">
              Le mot
            </div>
            <div className="font-greek mt-1 text-2xl">{word.grec}</div>
            <div className="mt-2 space-y-1 text-base">
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-base-content/55">Érasmien&nbsp;</span>
                <span>
                  <Translit
                    value={word.erasmien}
                    stressedClass="font-semibold text-accent underline decoration-accent/40 underline-offset-2"
                  />
                </span>
                <SpeakButton value={word.erasmien} />
              </div>
              {word.restituee && (
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-base-content/55">Restituée&nbsp;</span>
                  <span>
                    <Translit
                      value={word.restituee}
                      stressedClass="font-semibold text-accent underline decoration-accent/40 underline-offset-2"
                    />
                  </span>
                  <SpeakButton value={word.restituee} />
                </div>
              )}
            </div>
            {word.lemme && (
              <div className="mt-3">
                <div className="text-sm">
                  <span className="font-greek font-medium">{word.lemme}</span>
                  {word.nature ? <span className="text-base-content/55"> · {word.nature}</span> : null}
                </div>
                {glossFor(word.lemme) && (
                  <p className="mt-1 text-sm leading-snug text-base-content/70">
                    {glossFor(word.lemme)!.excerpt}
                    <span className="text-base-content/45"> — Bailly</span>
                  </p>
                )}
                <a
                  href={`#/concordance/${encodeURIComponent(word.lemme)}`}
                  className="mt-1.5 inline-block text-sm font-medium text-accent"
                >
                  définition complète & occurrences →
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
