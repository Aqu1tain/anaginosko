"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getLastRead, type LastRead } from "../../src/lib/lastRead";

export default function ResumeReading() {
  const [last, setLast] = useState<LastRead | null>(null);
  useEffect(() => setLast(getLastRead()), []);

  if (!last) return null;

  // Reprise du lecteur récurrent, vit dans le bandeau « pupitre » : pastille claire
  // (lavande) à deux lignes, pour ressortir sur le fond sombre du bandeau.
  return (
    <Link
      href={last.href}
      data-nosnippet=""
      className="flex items-center gap-3 rounded-xl bg-secondary px-4 py-2.5 text-secondary-content shadow-sm transition hover:bg-secondary/90"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
        <path d="M6 4h11a1 1 0 0 1 1 1v15l-6.5-4L5 20V5a1 1 0 0 1 1-1z" />
      </svg>
      <span className="min-w-0">
        <span className="block text-[0.62rem] font-semibold uppercase tracking-[0.12em] opacity-70">
          Reprendre la lecture
        </span>
        <span className="block truncate font-semibold leading-tight">{last.label}</span>
      </span>
      <span aria-hidden className="ml-2">→</span>
    </Link>
  );
}
