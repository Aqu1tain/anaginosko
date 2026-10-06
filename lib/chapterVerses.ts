import type { Text } from "../src/data/texts";
import type { CorpusConfig } from "../src/data/corpus";

export type PlainVerse = { v: number; grec: string; fr: string | null };

// Texte continu d'un chapitre (grec + français par verset), pour les moteurs, les
// lecteurs d'écran et la version Markdown. Même garde que le lecteur : le manifeste
// `_align` fait foi (chapitres réordonnés ou à additions → bloc) ; sinon heuristique
// (LXX + ensembles non identiques). Sans alignement, le français est rendu d'un bloc.
export function chapterVerses(text: Text, corpus: CorpusConfig): { verses: PlainVerse[]; frenchBlock: string | null } {
  const greek = new Map<number, string[]>();
  for (const m of text.mots ?? []) {
    if (m.verse == null) continue;
    if (!greek.has(m.verse)) greek.set(m.verse, []);
    greek.get(m.verse)!.push(m.grec);
  }
  const nums = [...greek.keys()].sort((a, b) => a - b);
  const frKeys = text.francais ? new Set(Object.keys(text.francais).map(Number)) : null;
  const blocked =
    text.frenchBlock ??
    (corpus.id === "lxx" && !(!!frKeys && nums.length === frKeys.size && nums.every((v) => frKeys.has(v))));
  const verses = nums.map((v) => ({
    v,
    grec: greek.get(v)!.join(" "),
    fr: blocked ? null : (text.francais?.[String(v)] ?? null),
  }));
  const frenchBlock =
    blocked && text.francais
      ? Object.keys(text.francais)
          .map(Number)
          .sort((a, b) => a - b)
          .map((v) => `${v} ${text.francais![String(v)]}`)
          .join(" ")
      : null;
  return { verses, frenchBlock };
}
