"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

export type TourStep = {
  /** Sélecteur de l'élément à mettre en lumière ; absent = étape centrée. */
  target?: string;
  title?: string;
  body: string;
};

// Premier élément réellement visible correspondant au sélecteur (la nav existe
// en double : barre du bas mobile + rail latéral desktop, l'un des deux caché).
function findVisible(sel: string): Element | null {
  for (const el of document.querySelectorAll(sel)) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

// Petit tutoriel guidé en plusieurs étapes (US-2). Le parent décide quand il est
// actif et mémorise sa fin ; ce composant gère la séquence, le spot et les
// repositionnements.
export default function Tour({
  active,
  steps,
  onDone,
}: {
  active: boolean;
  steps: TourStep[];
  onDone: () => void;
}) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [reduced, setReduced] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (active) setI(0);
  }, [active]);

  const step = steps[i];

  useEffect(() => {
    if (!active || !step?.target) {
      setRect(null);
      return;
    }
    let raf = 0;
    const place = () => {
      const el = findVisible(step.target!);
      setRect(el ? el.getBoundingClientRect() : null);
    };
    const t = setTimeout(place, 120); // laisser la mise en page se poser
    const onMove = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(place);
    };
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      clearTimeout(t);
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [active, step?.target]);

  const last = i === steps.length - 1;
  const next = useCallback(() => (last ? onDone() : setI((n) => n + 1)), [last, onDone]);
  const prev = () => setI((n) => Math.max(0, n - 1));

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDone();
      if (e.key === "ArrowRight" || e.key === "Enter") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, next, onDone]);

  if (!mounted || !active || !step) return null;

  const pad = 7;
  const spot = rect && {
    left: rect.left - pad,
    top: rect.top - pad,
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
  };
  const below = !!rect && rect.top < 150;
  const bubbleLeft = rect ? Math.min(Math.max(rect.left - 4, 12), window.innerWidth - 300) : 0;

  return createPortal(
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Tutoriel">
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={next}
        className="absolute inset-0 cursor-default"
      />

      {spot ? (
        <>
          <div
            className="pointer-events-none absolute rounded-xl"
            style={{ ...spot, boxShadow: "0 0 0 9999px rgba(0,0,0,0.66)" }}
          />
          <div
            className={`pointer-events-none absolute rounded-xl ring-2 ring-primary ${reduced ? "" : "animate-pulse"}`}
            style={spot}
            aria-hidden="true"
          />
        </>
      ) : (
        <div className="pointer-events-none absolute inset-0 bg-black/66" />
      )}

      <div
        className={
          rect
            ? `pointer-events-auto absolute w-[18rem] rounded-2xl border border-base-300 bg-base-100 p-3 shadow-2xl ${below ? "" : "-translate-y-full"}`
            : "pointer-events-auto absolute left-1/2 top-1/2 w-[18rem] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-base-300 bg-base-100 p-4 shadow-2xl"
        }
        style={rect ? { left: bubbleLeft, top: below ? rect.bottom + 14 : rect.top - 14 } : undefined}
      >
        {step.title && <h2 className="mb-1 font-semibold">{step.title}</h2>}
        <p className="text-sm leading-snug text-base-content/85">{step.body}</p>

        <div className="mt-3 flex items-center justify-center gap-1.5">
          {steps.map((_, n) => (
            <span
              key={n}
              className={`h-1.5 rounded-full transition-all ${n === i ? "w-4 bg-primary" : "w-1.5 bg-base-content/25"}`}
            />
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between gap-1.5">
          <button onClick={onDone} className="btn btn-ghost btn-sm px-3 text-base-content/70">
            Passer
          </button>
          <div className="flex items-center gap-1.5">
            {i > 0 && (
              <button onClick={prev} className="btn btn-ghost btn-sm px-3">
                Précédent
              </button>
            )}
            <button onClick={next} className="btn btn-primary btn-sm px-3">
              {last ? "Terminer" : "Suivant"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
