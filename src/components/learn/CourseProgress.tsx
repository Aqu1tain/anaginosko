"use client";

import Link from "next/link";
import { useProgress } from "../../hooks/useProgress";

type Lesson = { id: string; href: string };

// Avancement dans un cours. `compact` : la seule barre (cartes de la liste) ;
// sinon la carte du cours, avec le bouton pour commencer ou reprendre.
export default function CourseProgress({ lessons, compact = false }: { lessons: Lesson[]; compact?: boolean }) {
  const { signedIn, done } = useProgress();
  const finished = lessons.filter((l) => done.has(l.id)).length;
  const next = lessons.find((l) => !done.has(l.id)) ?? lessons[0];
  const pct = lessons.length ? Math.round((finished / lessons.length) * 100) : 0;

  const bar = signedIn && (
    <div>
      <div className="flex justify-between text-xs text-base-content/60">
        <span>{finished === lessons.length ? "Cours terminé" : `${finished} sur ${lessons.length} leçons`}</span>
        <span className="tabular-nums">{pct} %</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-base-200">
        <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
  if (compact) return bar || null;

  return (
    <div className="grid gap-4">
      {bar}
      {next && (
        <Link href={next.href} className="btn btn-primary w-full rounded-full">
          {finished === 0 ? "Commencer le cours" : finished === lessons.length ? "Revoir le cours" : "Reprendre"}
        </Link>
      )}
      {!signedIn && (
        <p className="text-center text-xs text-base-content/60">
          Compte gratuit requis pour lire les leçons. Pas de mot de passe.
        </p>
      )}
    </div>
  );
}
