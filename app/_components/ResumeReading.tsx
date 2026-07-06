"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getLastRead, type LastRead } from "../../src/lib/lastRead";

export default function ResumeReading() {
  const [last, setLast] = useState<LastRead | null>(null);
  useEffect(() => setLast(getLastRead()), []);

  if (!last) return null;

  // Action primaire pour le lecteur récurrent : c'est ici que vit la reprise (plus
  // sur l'onglet de nav). Poids visuel plein, taille du contenu (ne réserve aucune
  // largeur), donc reste propre qu'il y ait ou non un bandeau de soutien en dessous.
  return (
    <Link
      href={last.href}
      data-nosnippet=""
      className="mt-5 flex w-fit items-center gap-2.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-content shadow-sm transition-colors hover:bg-primary/90 wide:mt-8"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 3v6h6" />
        <path d="M3 9a9 9 0 1 0 2.5-4.7L3 7" />
      </svg>
      <span className="truncate">Reprendre la lecture&nbsp;: {last.label}</span>
      <span aria-hidden>→</span>
    </Link>
  );
}
