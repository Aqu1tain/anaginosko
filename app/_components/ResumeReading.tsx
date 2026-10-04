"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getLastRead, type LastRead } from "../../src/lib/lastRead";

// Reprise du lecteur récurrent : première pastille des raccourcis de l'accueil,
// pleine pour se distinguer des suggestions.
export default function ResumeReading() {
  const [last, setLast] = useState<LastRead | null>(null);
  useEffect(() => setLast(getLastRead()), []);

  if (!last) return null;

  return (
    <Link
      href={last.href}
      data-nosnippet=""
      className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 text-[0.95rem] font-semibold text-primary-content transition hover:bg-primary/90"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
        <path d="M6 4h11a1 1 0 0 1 1 1v15l-6.5-4L5 20V5a1 1 0 0 1 1-1z" />
      </svg>
      <span className="truncate">Reprendre : {last.label}</span>
    </Link>
  );
}
