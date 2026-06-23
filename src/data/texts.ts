import data from "./texts.json";

export type Mot = {
  grec: string;
  erasmien: string;
  restituee: string;
  verse: number | null;
  lemme: string | null;
  nature: string | null;
};

export type Text = {
  id: string;
  collection: string;
  niveau: number;
  reference: string;
  grec: string;
  translitErasmien: string | null;
  translitRestituee: string | null;
  mots: Mot[] | null;
};

export const wordCount = (text: Text): number =>
  text.mots?.length ?? text.grec.split(/\s+/).filter(Boolean).length;

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
export const texts = data.texts as Text[];

export const textById = (id: string): Text | undefined =>
  texts.find((t) => t.id === id);

export const textsByCollection = (collectionId: string): Text[] =>
  texts.filter((t) => t.collection === collectionId);
