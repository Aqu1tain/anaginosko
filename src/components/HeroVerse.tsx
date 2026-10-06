"use client";

import Link from "next/link";
import GreekText from "./GreekText";
import type { Text } from "../data/texts";

export type HeroWord = { lemma: string; gloss: string; nature: string; count: number };

// Vitrine du héros : le vrai verset Jean 1,1, réellement interactif. GreekText passe
// par le SheetContext global (app/providers), donc toucher un mot ouvre le panneau
// d'étude comme dans le lecteur. La carte du mot déborde du cadre en
// grand écran et mène à sa fiche de concordance.
export default function HeroVerse({ text, french, word }: { text: Text; french: string | null; word: HeroWord | null }) {
  return (
    <figure className="relative min-w-0 rounded-box border border-base-300 bg-base-100 p-6 shadow-[0_32px_64px_-32px_rgb(13_59_102/0.35)] wide:p-9">
      <figcaption className="text-sm font-semibold text-base-content/65">Jean 1, 1</figcaption>
      <div className="mt-3 font-greek leading-relaxed text-base-content">
        <GreekText text={text} size="lg" scale={0.9} />
      </div>
      {french && <p className="mt-4 font-greek text-lg italic leading-relaxed text-base-content/75">{french}</p>}
      <div className="mt-6 flex flex-col gap-5 wide:flex-row wide:items-end wide:justify-between">
        <p className="text-sm leading-relaxed text-base-content/65 wide:max-w-[26ch]">
          Touchez un mot : sens, analyse et{" "}
          <Link href="/prononciation" className="link decoration-primary/40 underline-offset-2">
            prononciation
          </Link>
          .
        </p>
        {word && (
          <Link
            href={`/concordance/${encodeURIComponent(word.lemma)}`}
            className="flex shrink-0 flex-col rounded-box bg-primary px-5 py-4 text-primary-content shadow-[0_24px_48px_-20px_rgb(13_59_102/0.6)] transition-transform hover:-translate-y-0.5 wide:-mb-14 wide:-mr-12 wide:w-60"
          >
            <span lang="grc" className="font-greek text-3xl leading-tight">
              {word.lemma}
            </span>
            <span className="font-greek text-lg italic">{word.gloss}</span>
            <span className="text-sm text-primary-content/80">
              {word.nature}, {word.count} fois dans le Nouveau Testament
            </span>
          </Link>
        )}
      </div>
    </figure>
  );
}
