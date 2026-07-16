import { BlockNoteSchema, defaultBlockSpecs, defaultInlineContentSpecs } from "@blocknote/core";

// Schéma de l'éditeur d'article. Blocs et inline par défaut ; la citation biblique
// (bloc verseQuote) et la référence de chapitre (inline chapterRef) sont ajoutées en
// Phase 3. Un seul point pour l'éditeur et le rendu.
export const schema = BlockNoteSchema.create({
  blockSpecs: { ...defaultBlockSpecs },
  inlineContentSpecs: { ...defaultInlineContentSpecs },
});
