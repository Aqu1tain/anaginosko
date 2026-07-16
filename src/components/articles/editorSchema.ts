import { BlockNoteSchema, defaultBlockSpecs, defaultInlineContentSpecs } from "@blocknote/core";
import { verseQuoteBlock } from "./blocks/verseQuoteBlock";
import { chapterRefInline } from "./blocks/chapterRefInline";

// Schéma de l'éditeur d'article : blocs et inline par défaut, plus la citation biblique
// (bloc verseQuote) et le renvoi de chapitre (inline chapterRef). Un seul point de vérité.
export const schema = BlockNoteSchema.create({
  blockSpecs: { ...defaultBlockSpecs, verseQuote: verseQuoteBlock() },
  inlineContentSpecs: { ...defaultInlineContentSpecs, chapterRef: chapterRefInline },
});
