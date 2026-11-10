import type { ChapterId } from "./corpus";
import { estherAddition, estherReadAfter, rahlfsLabel, type EstherAddition } from "../../lib/esther-additions.mjs";

// Matière deutérocanonique logée dans un livre protocanonique : un chapitre entier
// (additions d'Esther) ou une plage de versets (Daniel 3).
export type CanonPassage = { title: string; place?: string; from?: number; to?: number };

const RANGES: Record<string, CanonPassage> = {
  "dan-3": { title: "Prière d’Azarias et cantique des trois jeunes gens", from: 24, to: 90 },
};

export const additionTitle = (a: EstherAddition): string => `Addition ${a.id} · ${a.title}`;

export function canonPassage(book: string, chapter: ChapterId): CanonPassage | null {
  const addition = book === "est" ? estherAddition(chapter) : null;
  if (addition) return { title: additionTitle(addition), place: addition.place };
  return RANGES[`${book}-${chapter}`] ?? null;
}

export const inCanonPassage = (p: CanonPassage | null, v: number): boolean =>
  p?.from != null && p.to != null && v >= p.from && v <= p.to;

export const additionsReadAfter = (book: string, chapter: ChapterId): Map<number, EstherAddition> =>
  book === "est" ? estherReadAfter(chapter) : new Map();

// Numéro affiché d'un verset : celui de Rahlfs (« 17k ») dans une addition d'Esther.
export const verseLabel = (book: string, chapter: ChapterId, v: number): string =>
  (book === "est" && rahlfsLabel(chapter, v)?.split(":")[1]) || String(v);
