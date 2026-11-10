import Link from "next/link";
import type { EstherAddition } from "../../../lib/esther-additions.mjs";
import { additionTitle, type CanonPassage } from "../../data/canon";

export function CanonBanner({ passage }: { passage: CanonPassage }) {
  return (
    <div className="mb-4 border-l-2 border-secondary pl-3">
      <p className="text-xs font-medium text-base-content/70">
        Deutérocanonique{passage.place ? ` · ${passage.place}` : ""}
      </p>
      <p className="mt-0.5 font-semibold leading-snug">{passage.title}</p>
    </div>
  );
}

export function AdditionLink({ addition }: { addition: EstherAddition }) {
  return (
    <Link
      href={`/lxx/est/${addition.id}`}
      className="my-3 flex min-h-11 items-center justify-between gap-3 rounded-lg border border-base-300 px-3 py-2 text-sm transition-colors hover:border-primary/40 hover:bg-base-200"
    >
      <span>
        <span className="font-medium">{additionTitle(addition)}</span>
        <span className="block text-xs text-base-content/70">Deutérocanonique</span>
      </span>
      <span aria-hidden>→</span>
    </Link>
  );
}
