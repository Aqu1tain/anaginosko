"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useProgress } from "../../hooks/useProgress";

type Step = { href: string; title: string } | null;

// Fin de leçon : la marquer comme terminée (et passer à la suivante), naviguer.
export default function LessonActions({
  courseId,
  lessonId,
  prev,
  next,
  preview = false,
}: {
  courseId: string;
  lessonId: string;
  prev: Step;
  next: Step;
  preview?: boolean;
}) {
  const { done, mark } = useProgress();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const isDone = done.has(lessonId);

  const finish = async () => {
    setBusy(true);
    await mark(courseId, lessonId, true).catch(() => {});
    setBusy(false);
    if (next) router.push(next.href);
  };

  return (
    <div className="mt-12 grid gap-4">
      {!preview && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {isDone ? (
            <button type="button" onClick={() => mark(courseId, lessonId, false)} className="btn btn-ghost btn-sm gap-2 text-success">
              ✓ Leçon terminée
              <span className="font-normal text-base-content/50">Annuler</span>
            </button>
          ) : (
            <button type="button" onClick={finish} disabled={busy} className="btn btn-primary btn-sm">
              {next ? "Terminer la leçon" : "Terminer le cours"}
            </button>
          )}
        </div>
      )}
      <nav className="flex items-stretch justify-between gap-3 text-sm">
        {prev ? (
          <Link href={prev.href} className="max-w-[48%] rounded-box border border-base-300 px-4 py-3 transition-colors hover:border-primary/40">
            <span className="block text-xs text-base-content/50">← Précédente</span>
            <span className="font-medium">{prev.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link href={next.href} className="max-w-[48%] rounded-box border border-base-300 px-4 py-3 text-right transition-colors hover:border-primary/40">
            <span className="block text-xs text-base-content/50">Suivante →</span>
            <span className="font-medium">{next.title}</span>
          </Link>
        )}
      </nav>
    </div>
  );
}
