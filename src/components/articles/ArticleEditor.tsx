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

  // Insertion d'image via un input NATIF (le <label> ci-dessous) : un input.click()
  // programmatique serait bloqué hors « user activation » par les navigateurs.
  const onPickImage = async (file: File) => {
    try {
      const url = await uploadImage(articleId, await compressImage(file));
      editor.insertBlocks([{ type: "image", props: { url } }], editor.getTextCursorPosition().block, "after");
    } catch (e) {
      console.error("Upload image échoué :", e);
    }
  };

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
    {
      title: "Carte, vidéo ou graphique",
      subtext: "Intégrer YouTube, Maps, Datawrapper…",
      aliases: ["embed", "carte", "video", "graphique", "iframe"],
      group: "Anaginosko",
      onItemClick: () => editor.insertBlocks([{ type: "embed" }], editor.getTextCursorPosition().block, "after"),
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
      {editable && (
        <div className="mb-1 flex flex-wrap items-center gap-1 text-base-content/80">
          <label className="btn btn-ghost btn-xs cursor-pointer gap-1.5">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            Image
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(e) => {
                if (e.target.files?.[0]) onPickImage(e.target.files[0]);
                e.target.value = "";
              }}
            />
          </label>
          <button
            type="button"
            className="btn btn-ghost btn-xs gap-1.5"
            onClick={() => setPicker({ mode: "verse", initialQuery: "", initialShowFrench: true })}
          >
            <span className="font-greek text-sm leading-none">Α</span>
            Citation biblique
          </button>
          <button type="button" className="btn btn-ghost btn-xs gap-1.5" onClick={() => setPicker({ mode: "chapter", initialQuery: "" })}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10 13a5 5 0 007.5.5l3-3a5 5 0 00-7-7l-1.7 1.7" />
              <path d="M14 11a5 5 0 00-7.5-.5l-3 3a5 5 0 007 7l1.7-1.7" />
            </svg>
            Renvoi
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-xs gap-1.5"
            onClick={() => editor.insertBlocks([{ type: "embed" }], editor.getTextCursorPosition().block, "after")}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M10 9l5 3-5 3z" />
            </svg>
            Carte / vidéo
          </button>
          <span className="ml-auto hidden pr-1 text-[11px] text-base-content/40 sm:inline">« / » pour tous les blocs</span>
        </div>
      )}
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
