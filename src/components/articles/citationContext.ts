"use client";

import { createContext, useContext } from "react";
import type { VerseQuoteProps } from "./citationTypes";

// Pont entre un bloc de citation (rendu par BlockNote) et l'éditeur qui possède le
// picker : le bouton « Modifier » d'un bloc rouvre le picker pré-rempli.
export type CitationContextValue = { editVerse: (blockId: string, props: VerseQuoteProps) => void };

export const CitationContext = createContext<CitationContextValue | null>(null);
export const useCitation = () => useContext(CitationContext);
