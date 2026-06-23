import { createContext, useContext } from "react";
import type { GraphemeInfo } from "../lib/greek";
import type { WordContext } from "../lib/tokenize";

export type SheetPayload = {
  info: GraphemeInfo;
  word: WordContext | null;
};

export const SheetContext = createContext<(payload: SheetPayload) => void>(() => {});

export const useSheet = () => useContext(SheetContext);
