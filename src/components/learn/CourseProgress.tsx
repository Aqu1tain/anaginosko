"use client";

import Link from "next/link";
import { useProgress } from "../../hooks/useProgress";

type Lesson = { id: string; href: string };

// Avancement dans un cours et bouton pour commencer ou reprendre.
export default function CourseProgress({ lessons, compact = false }: { lessons: Lesson[]; compact?: boolean }) {
  const { signedIn, done } = useProgress();
  const finished = lessons.filter((l) => done.has(l.id)).length;
  const next = lessons.find((l) => !done.has(l.id)) ?? lessons[0];
  const pct = lessons.length ? Math.round((finished / lessons.length) * 100) : 0;

  return (
    <div className={compact ? "" : "flex flex-wrap items-center gap-4"}>
      {signedIn && (
        <div className="min-w-48 flex-1">
          <div className="flex justify-between text-xs text-base-content/65">
            <span>{finished === lessons.length ? "Cours terminé" : `${finished} leçon${finished > 1 ? "s" : ""} sur ${lessons.length}`}</span>
            <span className="tabular-nums">{pct} %</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-base-200">
            <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}
      {!compact && next && (
        <Link href={next.href} className="btn btn-primary rounded-full px-6">
          {finished === 0 ? "Commencer le cours" : finished === lessons.length ? "Revoir le cours" : "Reprendre"}
        </Link>
      )}
    </div>
  );
}
