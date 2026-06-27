"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getLastRead, type LastRead } from "../../src/lib/lastRead";

export default function ResumeReading() {
  const [last, setLast] = useState<LastRead | null>(null);
  useEffect(() => setLast(getLastRead()), []);

  if (!last) return null;

  // Pastille compacte (taille du contenu) : ne réserve aucune largeur, donc reste
  // propre qu'il y ait ou non un bandeau de soutien à côté.
  return (
    <Link
      href={last.href}
      className="mt-5 flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 wide:mt-8"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 3v6h6" />
        <path d="M3 9a9 9 0 1 0 2.5-4.7L3 7" />
      </svg>
      <span className="truncate">Reprendre&nbsp;: {last.label}</span>
      <span aria-hidden>→</span>
    </Link>
  );
}
