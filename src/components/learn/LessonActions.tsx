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
    <div className="mt-12 grid gap-4 border-t border-base-300 pt-6">
      {!preview && (
      <div className="flex flex-wrap items-center justify-between gap-3">
        {isDone ? (
          <button type="button" onClick={() => mark(courseId, lessonId, false)} className="btn btn-ghost btn-sm text-success">
            ✓ Leçon terminée · annuler
          </button>
        ) : (
          <button type="button" onClick={finish} disabled={busy} className="btn btn-primary rounded-full px-6">
            {next ? "Terminer et passer à la suite" : "Terminer le cours"}
          </button>
        )}
      </div>
      )}
      <nav className="flex items-stretch justify-between gap-3 text-sm">
        {prev ? (
          <Link href={prev.href} className="max-w-[48%] rounded-box border border-base-300 px-4 py-3 hover:bg-base-200">
            <span className="block text-xs text-base-content/55">← Précédente</span>
            <span className="font-medium">{prev.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link href={next.href} className="max-w-[48%] rounded-box border border-base-300 px-4 py-3 text-right hover:bg-base-200">
            <span className="block text-xs text-base-content/55">Suivante →</span>
            <span className="font-medium">{next.title}</span>
          </Link>
        )}
      </nav>
    </div>
  );
}
