import data from "./texts.json";

export type Mot = {
  grec: string;
  erasmien: string;
  restituee: string;
  verse: number | null;
  lemme: string | null;
  nature: string | null;
  /** analyse morphologique en français (cas/genre/nombre ou personne/temps/voix/mode). */
  morph: string | null;
};

export type Text = {
  id: string;
  collection: string;
  niveau: number;
  reference: string;
  grec: string;
  /** Bible Crampon (néo-Crampon, domaine public), par numéro de verset. */
  francais: Record<string, string> | null;
  maison?: Record<string, string> | null; // v -> traducteur (crédit des traductions maison)
  /** Versification française incompatible avec le grec (additions, réordonnancement) :
   *  afficher la traduction en bloc plutôt que de l'apparier verset par verset. */
  frenchBlock?: boolean;
  translitErasmien: string | null;
  translitRestituee: string | null;
  mots: Mot[] | null;
};

export const wordCount = (text: Text): number =>
  text.mots?.length ?? text.grec.split(/\s+/).filter(Boolean).length;

/** Nombre de versets distincts d'un passage (dérivé des jetons). */
export const verseCount = (text: Text): number =>
  new Set((text.mots ?? []).map((m) => m.verse).filter((v): v is number => v != null)).size;

/** Libellé de longueur, calculé sur le nombre réel de mots. */
export const lengthLabel = (text: Text): string => {
  const n = wordCount(text);
  if (n < 170) return "Court";
  if (n <= 240) return "Moyen";
  return "Long";
};

export type Collection = {
  id: string;
  title: string;
  subtitle: string;
};

export const collections = data.collections as Collection[];
export const texts = data.texts as unknown as Text[];

export const textById = (id: string): Text | undefined =>
  texts.find((t) => t.id === id);

// Ordonnés par niveau croissant (les plus accessibles d'abord) : le champ niveau
// pilote le parcours débutant, sans ordre codé en dur.
export const textsByCollection = (collectionId: string): Text[] =>
  texts.filter((t) => t.collection === collectionId).sort((a, b) => a.niveau - b.niveau);

// Niveau le plus bas d'une collection : sert à marquer les passages « pour débuter ».
export const minNiveau = (collectionId: string): number =>
  Math.min(...texts.filter((t) => t.collection === collectionId).map((t) => t.niveau));
