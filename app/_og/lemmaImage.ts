import { corpusById } from "@/src/data/corpus";
import { lemmaEntryFs, loadGlossFs } from "@/lib/nt-server";
import { lemmaCard } from "./cards";

// Carte OG d'une fiche-lemme : le lemme grec, sa translittération et le début de
// la définition (Bailly). Partagé par les routes concordance NT et LXX.
export async function lemmaOgImage(corpusId: string, lemmaParam: string) {
  const lemma = decodeURIComponent(lemmaParam);
  const corpus = corpusById(corpusId);
  const [entry, lexicon] = await Promise.all([
    lemmaEntryFs(lemma, corpus).catch(() => undefined),
    loadGlossFs(lemma, corpus),
  ]);
  return lemmaCard({
    lemma,
    translit: entry?.translit ?? null,
    gloss: lexicon.gloss?.excerpt ?? null,
    corpusLabel: corpus.shortLabel,
  });
}
