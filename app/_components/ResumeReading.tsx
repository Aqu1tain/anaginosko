"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getLastRead, type LastRead } from "../../src/lib/lastRead";

export default function ResumeReading() {
  const [last, setLast] = useState<LastRead | null>(null);
  useEffect(() => setLast(getLastRead()), []);

  if (!last) return null;

  return (
    <Link
      href={last.href}
      className="mt-4 flex items-center justify-between gap-3 rounded-box border border-primary/30 bg-primary/5 px-4 py-3 transition-colors hover:border-primary/50"
    >
      <span className="min-w-0">
        <span className="block text-xs font-semibold uppercase tracking-wide text-primary/80">
          Reprendre la lecture
        </span>
        <span className="block truncate font-semibold">{last.label}</span>
      </span>
      <span className="text-primary">→</span>
    </Link>
  );
}
