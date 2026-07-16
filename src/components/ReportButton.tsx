"use client";

import { useState } from "react";
import ReportEditor, { type ReportTarget } from "./ReportEditor";

// Bouton de signalement autonome : il gère sa propre modale (comme CopyVerseLink),
// donc on peut le poser n'importe où sans remonter d'état au parent. Visible pour
// tous (le signalement est ouvert aux visiteurs anonymes).
export default function ReportButton({
  target,
  label = "Signaler",
  className,
  children,
}: {
  target: ReportTarget;
  label?: string;
  className?: string;
  // Contenu personnalisé (ex. libellé texte) ; par défaut, une icône « drapeau ».
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const defaultClass = children
    ? "btn btn-ghost btn-xs text-base-content/60"
    : "btn btn-ghost btn-sm btn-circle text-base-content/50 opacity-70 transition hover:text-error hover:opacity-100 focus-visible:opacity-100 wide:opacity-0 wide:group-hover:opacity-100";
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label}
        title={label}
        className={className ?? defaultClass}
      >
        {children ?? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 21v-7m0 0V4h10l-1 2h6l-2 4 2 4h-9l-1-2H4z" />
          </svg>
        )}
      </button>
      {open && <ReportEditor target={target} onClose={() => setOpen(false)} />}
    </>
  );
}
