import { analyzeGrapheme, segment, type GraphemeInfo } from "./greek";
import type { Text } from "../data/texts";

export type WordContext = {
  grec: string;
  erasmien: string;
  restituee: string;
};

export type Word = {
  graphemes: GraphemeInfo[];
  /** prononciation du mot, si le jeu de données la fournit */
  context: WordContext | null;
  /** numéro de verset, si connu */
  verse: number | null;
};

export type Token =
  | { type: "word"; word: Word }
  | { type: "space" };

/**
 * Découpe un texte en jetons « mot » et « espace ».
 * - Passages : on s'appuie sur le tableau `mots` (1 jeton mot par entrée).
 * - Souffles : on découpe le grec sur les espaces.
 */
export function tokenizeText(text: Text): Token[] {
  if (text.mots && text.mots.length > 0) {
    const tokens: Token[] = [];
    text.mots.forEach((mot, i) => {
      if (i > 0) tokens.push({ type: "space" });
      tokens.push({
        type: "word",
        word: {
          graphemes: segmentToGraphemes(mot.grec),
          context: { grec: mot.grec, erasmien: mot.erasmien, restituee: mot.restituee },
          verse: mot.verse,
        },
      });
    });
    return tokens;
  }

  return text.grec
    .split(/(\s+)/)
    .filter((chunk) => chunk.length > 0)
    .map((chunk): Token =>
      /\s/.test(chunk)
        ? { type: "space" }
        : { type: "word", word: { graphemes: segmentToGraphemes(chunk), context: null, verse: null } },
    );
}

function segmentToGraphemes(s: string): GraphemeInfo[] {
  return segment(s).map(analyzeGrapheme);
}
