"use client";

import { Children, useState } from "react";

// Choix entre plusieurs messes du jour ou entre deux formes d'une lecture : les
// panneaux sont tous rendus côté serveur, un seul est visible.
export default function Choice({
  label,
  options,
  initial = 0,
  children,
}: {
  label: string;
  options: string[];
  initial?: number;
  children: React.ReactNode;
}) {
  const [active, setActive] = useState(initial);
  const panels = Children.toArray(children);
  return (
    <div>
      <div role="tablist" aria-label={label} className="flex flex-wrap gap-2">
        {options.map((option, idx) => (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={idx === active}
            onClick={() => setActive(idx)}
            className={`inline-flex min-h-10 items-center rounded-full px-4 text-sm font-medium transition-colors ${
              idx === active ? "bg-primary text-primary-content" : "bg-base-200 hover:text-accent"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
      {panels.map((panel, idx) => (
        <div key={idx} role="tabpanel" hidden={idx !== active}>
          {panel}
        </div>
      ))}
    </div>
  );
}
