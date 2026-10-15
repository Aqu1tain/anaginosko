"use client";

import Link from "next/link";
import { useProgress } from "../../hooks/useProgress";

type Part = { id: string; title: string; lessons: { id: string; title: string; excerpt: string; href: string }[] };

// Plan du cours : parties numérotées, leçons cochées une fois terminées.
export default function LessonList({ parts, current }: { parts: Part[]; current?: string }) {
  const { done } = useProgress();
  let n = 0;
  return (
    <ol className="grid gap-6">
      {parts.map((part, i) => (
        <li key={part.id}>
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-base-content/55">
            Partie {i + 1} · {part.title}
          </h2>
          <ol className="mt-2 divide-y divide-base-300 overflow-hidden rounded-box border border-base-300 bg-base-100">
            {part.lessons.map((l) => {
              n += 1;
              const isDone = done.has(l.id);
              const isCurrent = l.id === current;
              return (
                <li key={l.id}>
                  <Link
                    href={l.href}
                    aria-current={isCurrent ? "page" : undefined}
                    className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-base-200 ${isCurrent ? "bg-primary/5" : ""}`}
                  >
                    <span
                      className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold tabular-nums ${isDone ? "bg-success text-success-content" : "border border-base-300 text-base-content/60"}`}
                      aria-label={isDone ? "Terminée" : undefined}
                    >
                      {isDone ? "✓" : n}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-medium">{l.title}</span>
                      {l.excerpt && <span className="mt-0.5 line-clamp-2 block text-sm text-base-content/65">{l.excerpt}</span>}
                    </span>
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
