"use client";

import { useEffect, useRef, useState } from "react";
import { usePersistentState } from "@/src/hooks/usePersistentState";

// Intro éditoriale : on montre le début (quelques lignes, fondu), « Lire la
// suite » déplie le reste. Une intro courte s'affiche entière, sans bouton.
// Rendu SSR complet dans le HTML (SEO) ; la préférence, retenue par livre,
// s'applique après hydratation. Le lecteur peut aussi sauter aux chapitres.
const PREVIEW_PX = 176;

export default function CollapsibleIntro({
  corpus,
  book,
  long = true,
  children,
}: {
  corpus: string;
  book: string;
  long?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = usePersistentState(`book-intro:${corpus}:${book}`, false);
  const ref = useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = useState(long);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setOverflows(el.scrollHeight > PREVIEW_PX + 24);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const folded = overflows && !open;

  return (
    <div className="mb-6 border-b border-base-200 pb-5">
      <div className="relative">
        <div ref={ref} className={folded ? "max-h-44 overflow-hidden" : undefined}>
          {children}
        </div>
        {folded && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-base-100 to-transparent" aria-hidden="true" />
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        {overflows && (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            className="font-medium text-primary transition-colors hover:underline"
          >
            {open ? "Réduire l’introduction" : "Lire la suite"}
          </button>
        )}
        <a href="#chapitres" className="text-base-content/55 transition-colors hover:text-primary">
          Aller aux chapitres ↓
        </a>
      </div>
    </div>
  );
}
