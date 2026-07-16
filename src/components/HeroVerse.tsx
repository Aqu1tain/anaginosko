"use client";

import Link from "next/link";
import GreekText from "./GreekText";
import type { Text } from "../data/texts";

// Vitrine du héros : le vrai verset Jean 1,1, réellement interactif. GreekText passe
// par le SheetContext global (app/providers), donc toucher une lettre ouvre sa fiche
// (nom + prononciation) comme dans le lecteur, sans aucun câblage ici. Épuré : pas
// de carte, juste la typographie grecque et une invitation discrète.
export default function HeroVerse({ text }: { text: Text }) {
  return (
    <div>
      <div className="font-greek leading-relaxed text-base-content">
        <GreekText text={text} size="lg" scale={1.15} />
      </div>
      <p className="mt-5 text-sm leading-relaxed text-base-content/60">
        <span className="font-greek text-base-content/80">Jean 1, 1</span> : touchez une lettre pour son nom et
        sa prononciation, ou{" "}
        <Link href="/nt/jn/1" className="font-medium text-accent hover:underline">
          lisez le chapitre
        </Link>
        .
      </p>
    </div>
  );
}
