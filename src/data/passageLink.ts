import type { Mot } from "./texts";
import type { Annotation } from "../lib/api";

// Chaque « passage » est un extrait d'un chapitre du NT. On lie les deux pour
// partager les annotations à l'affichage (sans rien déplacer en base).
export const PASSAGE_TO_NT: Record<string, { book: string; chapter: number }> = {
  "passages-1": { book: "jn", chapter: 1 },
  "passages-2": { book: "mt", chapter: 5 },
  "passages-3": { book: "1co", chapter: 13 },
  "passages-4": { book: "php", chapter: 2 },
  "passages-5": { book: "jn", chapter: 15 },
  "passages-6": { book: "ro", chapter: 8 },
  "passages-7": { book: "lk", chapter: 2 },
  "passages-8": { book: "lk", chapter: 15 },
  "passages-9": { book: "1jn", chapter: 1 },
  "passages-10": { book: "heb", chapter: 11 },
  "passages-11": { book: "re", chapter: 21 },
  "passages-12": { book: "mt", chapter: 6 },
};

const ntRef = (book: string, chapter: number) => `nt-${book}-${chapter}`;

const NT_TO_PASSAGE: Record<string, string> = Object.fromEntries(
  Object.entries(PASSAGE_TO_NT).map(([pid, { book, chapter }]) => [ntRef(book, chapter), pid]),
);

export function parseNtRef(ref: string): { book: string; chapter: number } | null {
  const m = ref.match(/^nt-(.+)-(\d+)$/);
  return m ? { book: m[1], chapter: Number(m[2]) } : null;
}

/** Ref NT correspondant à un passage, ou inversement (null si pas de lien). */
export function linkedRef(ref: string): string | null {
  if (ref in PASSAGE_TO_NT) {
    const { book, chapter } = PASSAGE_TO_NT[ref];
    return ntRef(book, chapter);
  }
  if (ref in NT_TO_PASSAGE) return NT_TO_PASSAGE[ref];
  return null;
}

/** URL de lecture pour une annotation (NT ou passage), surlignant le mot. */
export function refHref(ref: string, wordIndex: number | null): string {
  const w = wordIndex != null ? `?w=${wordIndex}` : "";
  const nt = parseNtRef(ref);
  if (nt) return `#/nt/${nt.book}/${nt.chapter}${w}`;
  return `#/text/${ref}${w}`;
}

// Position d'un mot dans son verset (nombre de mots du même verset avant lui).
function intraVersePos(motIdx: number, mots: Mot[]): { verse: number; pos: number } | null {
  const verse = mots[motIdx]?.verse;
  if (verse == null) return null;
  let pos = 0;
  for (let i = 0; i < motIdx; i++) if (mots[i]?.verse === verse) pos++;
  return { verse, pos };
}

// Index de jeton (2×motIndex) du mot à (verset, position) dans un texte cible.
function tokenAt(verse: number, pos: number, mots: Mot[]): number | null {
  let seen = 0;
  for (let i = 0; i < mots.length; i++) {
    if (mots[i].verse === verse) {
      if (seen === pos) return i * 2;
      seen++;
    }
  }
  return null;
}

function remapToken(wordIndex: number, source: Mot[], target: Mot[]): number | null {
  const p = intraVersePos(wordIndex / 2, source);
  if (!p) return null;
  return tokenAt(p.verse, p.pos, target);
}

export type PlacedAnnotation = {
  a: Annotation;
  w: number;
  end: number | null;
  g: number | null;
  foreign: boolean;
};

/**
 * Remappe une annotation du texte source vers les coordonnées du texte cible
 * (tokenisation identique par verset). Renvoie null si le mot n'existe pas dans
 * la cible (ex. verset hors de la plage du passage) — l'annotation reste alors
 * visible uniquement dans son texte d'origine.
 */
export function remapAnnotation(a: Annotation, source: Mot[], target: Mot[]): PlacedAnnotation | null {
  if (a.wordIndex == null) return null;
  const w = remapToken(a.wordIndex, source, target);
  if (w == null) return null;
  let end: number | null = null;
  if (a.endWordIndex != null) {
    end = remapToken(a.endWordIndex, source, target);
    if (end == null) return null;
  }
  return { a, w, end, g: a.graphemeIndex, foreign: true };
}
