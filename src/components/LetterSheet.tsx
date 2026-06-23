import { useEffect, useRef } from "react";
import { accentLabel, breathingLabel } from "../lib/greek";
import type { SheetPayload } from "./SheetContext";
import Translit from "./Translit";

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
  payload,
  onClose,
}: {
  payload: SheetPayload;
  onClose: () => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const { info, word } = payload;
  const letter = info.letter;

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !boxRef.current) return;
      const items = boxRef.current.querySelectorAll<HTMLElement>(
        'button, [href], [tabindex]:not([tabindex="-1"])',
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      opener?.focus?.();
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
    <div
      className="modal modal-open modal-bottom sm:modal-middle"
      role="dialog"
      aria-modal="true"
      aria-label={`Lettre ${letter.name}`}
    >
      <div
        ref={boxRef}
        className="modal-box max-w-md pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
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
            ref={closeRef}
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

        {word && (
          <div className="mt-4 border-t border-base-300 pt-4">
            <div className="text-[0.7rem] font-medium uppercase tracking-wide text-base-content/55">
              Le mot
            </div>
            <div className="font-greek mt-1 text-2xl">{word.grec}</div>
            <div className="mt-2 space-y-0.5 text-base">
              <div>
                <span className="text-sm text-base-content/55">Érasmien&nbsp;</span>
                <Translit
                  value={word.erasmien}
                  stressedClass="font-semibold text-accent underline decoration-accent/40 underline-offset-2"
                />
              </div>
              {word.restituee && word.restituee !== word.erasmien && (
                <div>
                  <span className="text-sm text-base-content/55">Restituée&nbsp;</span>
                  <Translit
                    value={word.restituee}
                    stressedClass="font-semibold text-accent underline decoration-accent/40 underline-offset-2"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <button
        type="button"
        className="modal-backdrop"
        aria-label="Fermer"
        onClick={onClose}
      />
    </div>
  );
}
