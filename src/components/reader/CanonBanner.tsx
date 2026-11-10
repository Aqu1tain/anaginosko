import Link from "next/link";
import type { EstherAddition } from "../../../lib/esther-additions.mjs";
import { additionTitle, type CanonPassage } from "../../data/canon";

const tier = (place?: string) => `Deutérocanonique${place ? ` · ${place}` : ""}`;

export function CanonBanner({ passage }: { passage: CanonPassage }) {
  return (
    <div className="relative my-4 before:absolute before:inset-y-0 before:-left-3 before:w-0.5 before:bg-secondary first:mt-0">
      <p className="text-xs font-medium text-base-content/70">{tier(passage.place)}</p>
      <p className="mt-0.5 font-semibold leading-snug">{passage.title}</p>
    </div>
  );
}

export function AdditionLink({ addition }: { addition: EstherAddition }) {
  return (
    <Link
      href={`/lxx/est/${addition.id}`}
      className="my-3 flex min-h-11 items-center justify-between gap-3 rounded-lg bg-base-200 px-3 py-2 text-sm transition-colors hover:bg-base-300"
    >
      <span>
        <span className="font-medium">{additionTitle(addition)}</span>
        <span className="block text-xs text-base-content/70">{tier(addition.place)}</span>
      </span>
      <span aria-hidden>→</span>
    </Link>
  );
}
