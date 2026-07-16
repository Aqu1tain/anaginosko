"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/ariakit/style.css";
import { useState } from "react";
import { filterSuggestionItems } from "@blocknote/core";
import type { PartialBlock } from "@blocknote/core";
import {
  useCreateBlockNote,
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  type DefaultReactSuggestionItem,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/ariakit";
import { fr } from "@blocknote/core/locales";
import { schema } from "./editorSchema";
import { compressImage } from "./compressImage";
import CitationPicker from "./CitationPicker";
import { CitationContext } from "./citationContext";
import { bookFullName } from "@/src/data/refParse";
import type { VerseQuoteProps, ChapterRefProps } from "./citationTypes";
import { uploadImage } from "@/src/lib/articlesApi";

type Props = {
  articleId: string;
  initialContent: unknown[];
  editable: boolean;
  dark: boolean;
  onChange: (blocks: unknown[]) => void;
};

type PickerState =
  | { mode: "verse"; editBlockId?: string; initialQuery: string; initialShowFrench: boolean }
  | { mode: "chapter"; initialQuery: string }
  | null;

// Éditeur BlockNote, chargé uniquement côté admin (dynamic ssr:false). Slash menu
// enrichi (citation biblique, renvoi de chapitre) ; images compressées avant upload.
export default function ArticleEditor({ articleId, initialContent, editable, dark, onChange }: Props) {
  const [picker, setPicker] = useState<PickerState>(null);

  const editor = useCreateBlockNote({
    schema,
    dictionary: fr,
    initialContent: initialContent.length ? (initialContent as unknown as PartialBlock[]) : undefined,
    uploadFile: async (file: File) => uploadImage(articleId, await compressImage(file)),
  });

  const citationItems = (): DefaultReactSuggestionItem[] => [
    {
      title: "Citation biblique",
      subtext: "Passage grec avec traduction",
      aliases: ["citation", "verset", "bible", "grec"],
      group: "Anaginosko",
      onItemClick: () => setPicker({ mode: "verse", initialQuery: "", initialShowFrench: true }),
    },
    {
      title: "Référence de chapitre",
      subtext: "Renvoi Gen 1 / Genèse 1",
      aliases: ["ref", "chapitre", "renvoi"],
      group: "Anaginosko",
      onItemClick: () => setPicker({ mode: "chapter", initialQuery: "" }),
    },
  ];

  const handleConfirm = (props: VerseQuoteProps | ChapterRefProps) => {
    if (!picker) return;
    if (picker.mode === "verse") {
      const vp = props as VerseQuoteProps;
      if (picker.editBlockId) editor.updateBlock(picker.editBlockId, { props: vp });
      else editor.insertBlocks([{ type: "verseQuote", props: vp }], editor.getTextCursorPosition().block, "after");
    } else {
      editor.insertInlineContent([{ type: "chapterRef", props: props as ChapterRefProps }, " "]);
    }
    setPicker(null);
  };

  const editVerse = (blockId: string, props: VerseQuoteProps) => {
    const verses = props.verseEnd > props.verseStart ? `${props.verseStart}-${props.verseEnd}` : `${props.verseStart}`;
    setPicker({
      mode: "verse",
      editBlockId: blockId,
      initialQuery: `${bookFullName(props.corpus, props.book)} ${props.chapter}:${verses}`,
      initialShowFrench: props.showFrench,
    });
  };

  return (
    <CitationContext.Provider value={{ editVerse }}>
      <BlockNoteView
        editor={editor}
        editable={editable}
        theme={dark ? "dark" : "light"}
        slashMenu={false}
        onChange={() => onChange(editor.document)}
      >
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={async (query) =>
            filterSuggestionItems([...getDefaultReactSlashMenuItems(editor), ...citationItems()], query)
          }
        />
      </BlockNoteView>

      {picker && (
        <CitationPicker
          mode={picker.mode}
          initialQuery={picker.initialQuery}
          initialShowFrench={picker.mode === "verse" ? picker.initialShowFrench : true}
          onConfirm={handleConfirm}
          onClose={() => setPicker(null)}
        />
      )}
    </CitationContext.Provider>
  );
}
