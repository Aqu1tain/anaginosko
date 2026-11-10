import Link from "next/link";
import type { EstherAddition } from "../../../lib/esther-additions.mjs";
import { additionTitle, type CanonPassage } from "../../data/canon";
import Chevron from "../Chevron";

// « Deutérocanonique » et sa définition, au survol ou au focus du point d'interrogation.
// Le parent porte `relative` : l'infobulle s'aligne sur le début de la ligne.
function Tier({ children }: { children?: React.ReactNode }) {
  return (
    <p className="pointer-events-none relative text-xs font-medium text-base-content/70">
      Deutérocanonique
      <span className="group/tip">
        <button
          type="button"
          aria-label="Définition de deutérocanonique"
          className="pointer-events-auto relative z-10 ml-1 inline-grid size-4 cursor-help place-items-center rounded-full border border-current align-[-0.2em] text-[0.625rem] leading-none before:absolute before:-inset-3.5 hover:text-base-content"
        >
          ?
        </button>
        <span
          role="tooltip"
          className="pointer-events-none absolute left-0 top-full z-20 mt-1.5 w-64 max-w-full rounded-md bg-neutral px-2.5 py-1.5 font-normal leading-snug text-neutral-content opacity-0 transition-opacity group-focus-within/tip:opacity-100 group-hover/tip:opacity-100"
        >
          Reçu comme Écriture par l’Église catholique, absent de la Bible hébraïque.
        </span>
      </span>
      {children}
    </p>
  );
}

export function CanonBanner({ passage }: { passage: CanonPassage }) {
  return (
    <div className="relative my-4 before:absolute before:inset-y-0 before:-left-3 before:w-0.5 before:bg-secondary first:mt-0">
      <Tier>{passage.place ? ` · ${passage.place}` : null}</Tier>
      <p className="mt-0.5 font-semibold leading-snug">{passage.title}</p>
    </div>
  );
}

// Addition qui se lit entre deux versets : une bande ouverte dans le texte, bordée de
// pointillés, dont toute la surface mène à l'addition.
export function AdditionLink({ addition }: { addition: EstherAddition }) {
  return (
    <div className="relative -mt-px flex min-h-11 items-center justify-between gap-3 border-y border-dashed border-secondary bg-secondary/10 px-3 py-2.5 text-sm transition-colors hover:bg-secondary/20">
      <div className="min-w-0">
        <Link href={`/lxx/est/${addition.id}`} className="font-medium after:absolute after:inset-0">
          {additionTitle(addition)}
        </Link>
        <Tier> · {addition.units.length} versets à lire ici</Tier>
      </div>
      <span className="text-base text-base-content/70">
        <Chevron to="right" />
      </span>
    </div>
  );
}
