import { BlockNoteSchema, defaultBlockSpecs, defaultInlineContentSpecs } from "@blocknote/core";
import { verseQuoteBlock } from "./blocks/verseQuoteBlock";
import { chapterRefInline } from "./blocks/chapterRefInline";
import { embedBlock } from "./blocks/embedBlock";

// On retire audio/vidéo/fichier : l'upload n'accepte que des images, et ces blocs
// encombraient le menu « / » (et provoquaient un échec d'upload sur un mp3). L'image
// reste. On ajoute la citation biblique (verseQuote), l'intégration (embed) et le
// renvoi de chapitre (inline chapterRef).
const { audio: _audio, video: _video, file: _file, ...baseBlockSpecs } = defaultBlockSpecs;
void _audio;
void _video;
void _file;

export const schema = BlockNoteSchema.create({
  blockSpecs: { ...baseBlockSpecs, verseQuote: verseQuoteBlock(), embed: embedBlock() },
  inlineContentSpecs: { ...defaultInlineContentSpecs, chapterRef: chapterRefInline },
});
