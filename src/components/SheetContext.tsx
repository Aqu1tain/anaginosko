"use client";

import { createContext, useContext } from "react";
import type { GraphemeInfo } from "../lib/greek";
import type { WordContext } from "../lib/tokenize";

export type SheetStage = 1 | 2;

/** Ce que le contexte expose pour le surlignage dans le texte. */
export type ActiveLetter = {
  key: string;
  w: number;
  g: number;
  stage: SheetStage;
};

export type LetterClick = {
  w: number;
  g: number;
  info: GraphemeInfo;
  word: WordContext | null;
};

export type SheetApi = {
  active: ActiveLetter | null;
  /** Lecture : 1er clic = lettre, 2e clic = mot, 3e clic = ferme. */
  clickLetter: (arg: LetterClick) => void;
  /** Alphabet : ouvre directement la fiche d'une lettre. */
  openLetter: (info: GraphemeInfo) => void;
};

export const SheetContext = createContext<SheetApi>({
  active: null,
  clickLetter: () => {},
  openLetter: () => {},
});

export const useSheet = () => useContext(SheetContext);
