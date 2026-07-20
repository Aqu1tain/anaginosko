"use client";

import { createReactInlineContentSpec } from "@blocknote/react";
import { chapterRefLabel } from "@/src/data/refParse";
import type { ChapterRefProps } from "../citationTypes";

// Renvoi inline vers un chapitre. Dans l'éditeur : un span non navigant (le clic ne
// doit pas quitter l'article en cours d'édition). Le rendu public utilise ChapterRefLink.
export const chapterRefInline = createReactInlineContentSpec(
  {
    type: "chapterRef",
    propSchema: {
      corpus: { default: "nt" },
      book: { default: "" },
      chapter: { default: 1 },
      form: { default: "short" },
    },
    content: "none",
  },
  {
    render: ({ inlineContent }) => {
      const p = inlineContent.props as ChapterRefProps;
      return (
        <span
          contentEditable={false}
          className="font-medium text-primary underline decoration-primary/40 underline-offset-2"
        >
          {chapterRefLabel(p.corpus, p.book, p.chapter, p.form)}
        </span>
      );
    },
  },
);
