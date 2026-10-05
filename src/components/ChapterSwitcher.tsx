"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import BibleNavigator, { type NavCorpus, type NavPosition } from "./BibleNavigator";

type Step = { href: string; label: string } | null;

function Arrow({ step, dir }: { step: Step; dir: "prev" | "next" }) {
  const glyph = dir === "prev" ? "‹" : "›";
  if (!step) return <span aria-hidden className="grid h-10 w-10 place-items-center text-xl opacity-25">{glyph}</span>;
  return (
    <Link
      href={step.href}
      aria-label={step.label}
      title={step.label}
      className="grid h-10 w-10 place-items-center rounded-full text-xl transition-colors hover:bg-base-200"
    >
      <span aria-hidden>{glyph}</span>
    </Link>
  );
}

// Barre du haut d'un chapitre : chapitre précédent, sélecteur livre et chapitre,
// chapitre suivant.
export default function ChapterSwitcher({
  corpora,
  current,
  label,
  prev,
  next,
}: {
  corpora: NavCorpus[];
  current: NavPosition;
  label: string;
  prev: Step;
  next: Step;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="flex items-center gap-1">
      <Arrow step={prev} dir="prev" />
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-base-300 bg-base-100 px-4 font-semibold transition-colors hover:border-primary/40"
      >
        {label}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <Arrow step={next} dir="next" />
      {open &&
        createPortal(
          <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-start sm:p-4 sm:pt-20">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} aria-hidden="true" />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Aller à un livre ou un chapitre"
              className="relative max-h-[85dvh] w-full overflow-y-auto rounded-t-3xl border border-base-300 bg-base-100 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:max-w-2xl sm:rounded-3xl"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Aller à</h2>
                <button type="button" onClick={() => setOpen(false)} aria-label="Fermer" className="btn btn-ghost btn-sm btn-circle">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
              <BibleNavigator corpora={corpora} current={current} onNavigate={() => setOpen(false)} />
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
