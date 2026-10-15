"use client";

import Link from "next/link";
import { useProgress } from "../../hooks/useProgress";

type Part = { id: string; title: string; lessons: { id: string; title: string; href: string }[] };

// Plan du cours : deux niveaux seulement, la partie et ses leçons (cochées une fois
// terminées). Le résumé de chaque leçon reste sur la leçon elle-même.
export default function LessonList({ parts, current }: { parts: Part[]; current?: string }) {
  const { done } = useProgress();
  let n = 0;
  return (
    <ol className="grid gap-8">
      {parts.map((part, i) => (
        <li key={part.id}>
          <h2 className="flex items-baseline gap-3 text-lg font-semibold">
            <span className="text-sm font-normal tabular-nums text-base-content/45">{i + 1}</span>
            {part.title}
          </h2>
          <ol className="mt-2 border-l border-base-300 pl-4">
            {part.lessons.map((l) => {
              n += 1;
              const isDone = done.has(l.id);
              const isCurrent = l.id === current;
              return (
                <li key={l.id}>
                  <Link
                    href={l.href}
                    aria-current={isCurrent ? "page" : undefined}
                    className={`-ml-px flex items-center gap-3 rounded-r-lg border-l-2 py-2 pl-3 pr-2 transition-colors hover:bg-base-200 ${isCurrent ? "border-primary bg-primary/5 font-medium" : "border-transparent"}`}
                  >
                    <span
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs tabular-nums ${isDone ? "bg-success text-success-content" : "text-base-content/50"}`}
                      aria-label={isDone ? "Terminée" : undefined}
                    >
                      {isDone ? "✓" : n}
                    </span>
                    <span className="min-w-0 truncate">{l.title}</span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </li>
      ))}
    </ol>
  );
}
