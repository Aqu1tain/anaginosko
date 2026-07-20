import { corpusById } from "@/src/data/corpus";
import { lemmaEntryFs } from "@/lib/nt-server";
import { glossFor } from "@/src/data/glosses";
import { lemmaCard } from "./cards";

// Carte OG d'une fiche-lemme : le lemme grec, sa translittération et le début de
// la définition (Bailly). Partagé par les routes concordance NT et LXX.
export async function lemmaOgImage(corpusId: string, lemmaParam: string) {
  const lemma = decodeURIComponent(lemmaParam);
  const corpus = corpusById(corpusId);
  const entry = await lemmaEntryFs(lemma, corpus).catch(() => undefined);
  return lemmaCard({
    lemma,
    translit: entry?.translit ?? null,
    gloss: glossFor(lemma)?.excerpt ?? null,
    corpusLabel: corpus.shortLabel,
  });
}
