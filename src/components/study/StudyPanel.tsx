"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const WIDE = "(min-width: 75rem)";

// Panneau d'étude. Grand écran : colonne fixe à droite, le texte se décale pour
// rester entièrement visible (html[data-study-panel], voir globals.css) et l'on
// passe d'un mot à l'autre sans le refermer. Mobile : tiroir en bas, agrandissable,
// refermé par un toucher hors du tiroir.
export default function StudyPanel({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  const boxRef = useRef<HTMLElement>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.studyPanel = "open";
    return () => {
      delete root.dataset.studyPanel;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onPointerDown = (e: PointerEvent) => {
      if (window.matchMedia(WIDE).matches) return;
      const t = e.target as HTMLElement;
      if (boxRef.current?.contains(t) || t.closest(".glyph")) return;
      onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [onClose]);

  return (
    <aside
      ref={boxRef}
      role="dialog"
      aria-modal="false"
      data-study-panel-box=""
      aria-label={label}
      className={`animate-study fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-3xl border-t border-base-300 bg-base-100 shadow-[0_-24px_48px_-24px_rgb(13_59_102/0.35)] transition-[max-height] duration-300 ${expanded ? "max-h-[88dvh]" : "max-h-[58dvh]"} wide:inset-x-auto wide:right-0 wide:top-[calc(3.5rem+1px+env(safe-area-inset-top))] wide:z-40 wide:max-h-none wide:w-[26rem] wide:rounded-none wide:border-t-0 wide:border-l wide:shadow-[-24px_0_48px_-32px_rgb(13_59_102/0.3)]`}
    >
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-label={expanded ? "Réduire" : "Agrandir"}
        aria-expanded={expanded}
        className="flex shrink-0 justify-center pt-2.5 pb-1 wide:hidden"
      >
        <span className="h-1.5 w-11 rounded-full bg-base-300" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer"
        className="btn btn-ghost btn-sm btn-circle absolute right-3 top-3 z-10 text-base-content/70 wide:right-4 wide:top-4"
      >
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] wide:px-6 wide:pt-6 wide:pb-10">
        {children}
      </div>
    </aside>
  );
}
