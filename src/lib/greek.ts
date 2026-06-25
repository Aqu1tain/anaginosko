import { letters, type Letter } from "../data/alphabet";

const byKey = new Map<string, Letter>();
for (const letter of letters) {
  for (const key of letter.keys) byKey.set(key, letter);
}

// Toute marque combinante (catégorie Unicode Mark).
const COMBINING = /\p{M}/gu;

const PSILI = "̓"; // esprit doux (comma above)
const DASIA = "̔"; // esprit rude (reversed comma above)
const OXIA = "́"; // aigu
const VARIA = "̀"; // grave
const PERISPOMENI = "͂"; // circonflexe (perispomeni)
const YPOGEGRAMMENI = "ͅ"; // iota souscrit

export type Breathing = "doux" | "rude" | null;
export type AccentKind = "aigu" | "grave" | "circonflexe" | null;

export type GraphemeInfo = {
  /** le cluster tel qu'affiché (lettre + diacritiques) */
  cluster: string;
  /** entrée de l'alphabet, ou null si ce n'est pas une lettre grecque */
  letter: Letter | null;
  isFinalSigma: boolean;
  breathing: Breathing;
  accent: AccentKind;
  iotaSubscript: boolean;
};

const segmenter =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter("el", { granularity: "grapheme" })
    : null;

export function segment(text: string): string[] {
  if (segmenter) {
    return Array.from(segmenter.segment(text), (s) => s.segment);
  }
  return Array.from(text);
}

export function analyzeGrapheme(cluster: string): GraphemeInfo {
  const decomposed = cluster.normalize("NFD");
  const base = decomposed.replace(COMBINING, "");
  const baseChar = base[0] ?? "";
  const lower = baseChar.toLowerCase();
  const isFinalSigma = baseChar === "ς"; // ς
  const letter = byKey.get(lower) ?? byKey.get(baseChar) ?? null;

  const marks = decomposed.slice(baseChar.length);
  const breathing: Breathing = marks.includes(DASIA)
    ? "rude"
    : marks.includes(PSILI)
      ? "doux"
      : null;
  const accent: AccentKind = marks.includes(PERISPOMENI)
    ? "circonflexe"
    : marks.includes(OXIA)
      ? "aigu"
      : marks.includes(VARIA)
        ? "grave"
        : null;

  return {
    cluster,
    letter,
    isFinalSigma,
    breathing,
    accent,
    iotaSubscript: marks.includes(YPOGEGRAMMENI),
  };
}

export const isClickable = (info: GraphemeInfo): boolean => info.letter !== null;

export const breathingLabel = (b: Breathing): string | null =>
  b === "doux" ? "Esprit doux" : b === "rude" ? "Esprit rude (h)" : null;

export const accentLabel = (a: AccentKind): string | null =>
  a === "aigu"
    ? "Accent aigu"
    : a === "grave"
      ? "Accent grave"
      : a === "circonflexe"
        ? "Accent circonflexe"
        : null;

/**
 * Découpe une translittération du jeu de données (voyelle accentuée en
 * MAJUSCULE) en segments marqués comme accentués ou non, pour un rendu propre.
 */
export type TranslitPiece = { text: string; stressed: boolean };

// Diphtongues : la lettre rouge (accentuée) va sur la 2e voyelle, car l'accent
// grec porte sur le 2e élément. Les hiatus (« ai/ei/oi » SANS tréma) n'en sont
// pas et gardent l'accent sur la voyelle réellement marquée.
const STRESS_SHIFT_DIPH = new Set(["au", "eu", "ou", "ui", "aï", "éï", "oï"]);

export function translitPieces(translit: string): TranslitPiece[] {
  const chars = [...translit];
  const isUpper = (c: string) => c !== c.toLowerCase() && c === c.toUpperCase();
  const red = new Set<number>();
  for (let i = 0; i < chars.length; i++) {
    if (!isUpper(chars[i])) continue;
    const next = chars[i + 1];
    const pair = (chars[i] + (next ?? "")).toLowerCase();
    red.add(next && STRESS_SHIFT_DIPH.has(pair) ? i + 1 : i);
  }
  const pieces: TranslitPiece[] = [];
  for (let i = 0; i < chars.length; i++) {
    const stressed = red.has(i);
    const text = chars[i].toLowerCase();
    const last = pieces[pieces.length - 1];
    if (last && last.stressed === stressed) last.text += text;
    else pieces.push({ text, stressed });
  }
  return pieces;
}
