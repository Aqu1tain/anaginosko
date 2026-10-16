"use client";

import { useState } from "react";

export type BookCount = { id: string; name: string; count: number };

const SHOWN = 8;

// Répartition compacte : les livres les plus fréquents, cliquables pour filtrer.
export default function BookBars({
  books,
  value,
  onChange,
}: {
  books: BookCount[];
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const [all, setAll] = useState(false);
  const sorted = [...books].sort((a, b) => b.count - a.count);
  const max = sorted[0]?.count ?? 1;
  const list = all ? sorted : sorted.slice(0, SHOWN);

  return (
    <div>
      <ul className="space-y-0.5">
        {list.map((b) => {
          const on = value === b.id;
          return (
            <li key={b.id}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => onChange(on ? null : b.id)}
                className={`group w-full rounded-md px-2 py-1.5 text-left transition-colors ${on ? "bg-primary/10" : "hover:bg-base-200/70"}`}
              >
                <span className="flex items-baseline justify-between gap-2 text-sm">
                  <span className={`truncate ${on ? "font-semibold text-primary" : ""}`}>{b.name}</span>
                  <span className="tabular-nums text-xs text-base-content/55">{b.count}</span>
                </span>
                <span className="mt-1 block h-1 rounded-full bg-base-200">
                  <span className={`block h-1 rounded-full ${on ? "bg-primary" : "bg-primary/45"}`} style={{ width: `${Math.max(4, (b.count / max) * 100)}%` }} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {sorted.length > SHOWN && (
        <button type="button" className="mt-1 px-2 text-xs font-medium text-primary hover:underline" onClick={() => setAll(!all)}>
          {all ? "Réduire" : `Les ${sorted.length} livres`}
        </button>
      )}
    </div>
  );
}
