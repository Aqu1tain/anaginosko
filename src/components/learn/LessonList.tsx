"use client";

import Link from "next/link";
import { useProgress } from "../../hooks/useProgress";

type Part = { id: string; title: string; lessons: { id: string; title: string; href: string }[] };

// Plan du cours : deux niveaux seulement, la partie et ses leçons (cochées une fois
// terminées). Le résumé de chaque leçon reste sur la leçon elle-même. À côté d'une
// leçon (`current`), le plan se fait compact.
export default function LessonList({ parts, current }: { parts: Part[]; current?: string }) {
  const { done } = useProgress();
  const compact = current !== undefined;
  let n = 0;
  return (
    <ol className={compact ? "grid gap-4 text-sm" : "grid gap-8"}>
      {parts.map((part, i) => (
        <li key={part.id}>
          <h2 className={`flex items-baseline font-semibold ${compact ? "gap-2 text-sm" : "gap-3 text-lg"}`}>
            <span className={`font-normal tabular-nums text-base-content/45 ${compact ? "text-xs" : "text-sm"}`}>{i + 1}</span>
            {part.title}
          </h2>
          <ol className={`border-l border-base-300 ${compact ? "mt-1 pl-2" : "mt-2 pl-4"}`}>
            {part.lessons.map((l) => {
              n += 1;
              const isDone = done.has(l.id);
              const isCurrent = l.id === current;
              return (
                <li key={l.id}>
                  <Link
                    href={l.href}
                    aria-current={isCurrent ? "page" : undefined}
                    className={`-ml-px flex rounded-r-lg border-l-2 pr-2 transition-colors ${compact ? "items-start gap-2 py-1 pl-2" : "items-center gap-3 py-2 pl-3"} hover:bg-base-200 ${isCurrent ? "border-primary bg-primary/5 font-medium" : "border-transparent"}`}
                  >
                    <span
                      className={`grid shrink-0 place-items-center rounded-full tabular-nums ${compact ? "h-5 w-5 text-[11px]" : "h-6 w-6 text-xs"} ${isDone ? "bg-success text-success-content" : "text-base-content/50"}`}
                      aria-label={isDone ? "Terminée" : undefined}
                    >
                      {isDone ? "✓" : n}
                    </span>
                    <span className={compact ? "min-w-0 leading-snug" : "min-w-0 truncate"}>{l.title}</span>
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
