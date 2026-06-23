import data from "./texts.json";

export type Mot = {
  grec: string;
  erasmien: string;
  restituee: string;
  verse: number | null;
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

const LEVELS: Record<number, string> = {
  1: "Souffle",
  2: "Verset",
  3: "Passage",
  4: "Lecture",
};

export const levelLabel = (n: number): string => LEVELS[n] ?? `Niveau ${n}`;

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
