import { BlockNoteSchema, defaultBlockSpecs, defaultInlineContentSpecs } from "@blocknote/core";
import { verseQuoteBlock } from "./blocks/verseQuoteBlock";
import { chapterRefInline } from "./blocks/chapterRefInline";
import { embedBlock } from "./blocks/embedBlock";

// Schéma de l'éditeur d'article : blocs et inline par défaut, plus la citation biblique
// (verseQuote), l'intégration (embed) et le renvoi de chapitre (inline chapterRef).
export const schema = BlockNoteSchema.create({
  blockSpecs: { ...defaultBlockSpecs, verseQuote: verseQuoteBlock(), embed: embedBlock() },
  inlineContentSpecs: { ...defaultInlineContentSpecs, chapterRef: chapterRefInline },
});
