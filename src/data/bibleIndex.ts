import type { LemmaEntry } from "./nt";
import { NT, LXX, GREEK_BIBLE, corpusById, type CorpusConfig } from "./corpus";

// Index de la Bible grecque : union des lemmes NT et LXX, avec le compte par
// corpus. Un lemme présent dans le NT garde sa fiche /concordance (qui croise déjà
// les deux corpus) ; un lemme propre à la Septante renvoie à /lxx/concordance.
export type BibleLemma = LemmaEntry & { nt: number; lxx: number };

const greek = new Intl.Collator("el");

export const isBible = (c: CorpusConfig): boolean => c.id === "bible";

// La config Bible grecque porte une fonction (routePrefixOf) : une page serveur
// ne peut pas la sérialiser vers un composant client, qui la résout donc par id.
export const concordanceCorpus = (id: string): CorpusConfig => (id === "bible" ? GREEK_BIBLE : corpusById(id));

export function mergeLemmaIndexes(nt: LemmaEntry[], lxx: LemmaEntry[]): BibleLemma[] {
  const byLemma = new Map<string, BibleLemma>();
  for (const e of nt) byLemma.set(e.lemma, { ...e, nt: e.count, lxx: 0 });
  for (const e of lxx) {
    const known = byLemma.get(e.lemma);
    if (!known) {
      byLemma.set(e.lemma, { ...e, nt: 0, lxx: e.count });
      continue;
    }
    known.lxx = e.count;
    known.count = known.nt + e.count;
  }
  return [...byLemma.values()].sort((a, b) => greek.compare(a.lemma, b.lemma));
}

export const lemmaConcordanceBase = (e: BibleLemma): string =>
  e.nt > 0 ? NT.concordanceBase : LXX.concordanceBase;
