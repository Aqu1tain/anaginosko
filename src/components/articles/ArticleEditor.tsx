"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { fr } from "@blocknote/core/locales";
import type { PartialBlock } from "@blocknote/core";
import { schema } from "./editorSchema";
import { compressImage } from "./compressImage";
import { uploadImage } from "@/src/lib/articlesApi";

type Props = {
  articleId: string;
  initialContent: unknown[];
  editable: boolean;
  dark: boolean;
  onChange: (blocks: unknown[]) => void;
};

// Éditeur BlockNote, chargé uniquement côté admin (dynamic ssr:false). Les images sont
// compressées puis envoyées au handler d'upload, qui renvoie une URL /articles/uploads/…
export default function ArticleEditor({ articleId, initialContent, editable, dark, onChange }: Props) {
  const editor = useCreateBlockNote({
    schema,
    dictionary: fr,
    initialContent: initialContent.length ? (initialContent as unknown as PartialBlock[]) : undefined,
    uploadFile: async (file: File) => uploadImage(articleId, await compressImage(file)),
  });

  return (
    <BlockNoteView
      editor={editor}
      editable={editable}
      theme={dark ? "dark" : "light"}
      onChange={() => onChange(editor.document)}
    />
  );
}
