"use client";

import { usePersistentState } from "@/src/hooks/usePersistentState";

// Intro éditoriale repliable : elle peut être longue et repousser la grille des
// chapitres. Le lecteur la masque (préférence retenue par livre) ou saute droit
// aux chapitres via l'ancre #chapitres. Rendu SSR ouvert (contenu dans le HTML,
// bon pour le SEO) ; la préférence s'applique après hydratation.
export default function CollapsibleIntro({
  corpus,
  book,
  children,
}: {
  corpus: string;
  book: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = usePersistentState(`book-intro:${corpus}:${book}`, true);
  return (
    <div className="mb-6 border-b border-base-200 pb-5">
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="font-medium text-base-content/70 transition-colors hover:text-primary"
        >
          {open ? "Masquer l’introduction" : "Afficher l’introduction"}
        </button>
        <a href="#chapitres" className="text-base-content/55 transition-colors hover:text-primary">
          Aller aux chapitres ↓
        </a>
      </div>
      <div className={open ? "" : "hidden"}>{children}</div>
    </div>
  );
}
