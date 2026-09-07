"use client";

import { useEffect, useState } from "react";
import { createReactBlockSpec } from "@blocknote/react";
import VerseQuoteView from "../VerseQuoteView";
import { useCitation } from "../citationContext";
import { loadChapterVerses, sliceVerses } from "../citationText";
import type { VerseLine, VerseQuoteProps } from "../citationTypes";

// Bloc de citation biblique. Props scalaires (contrainte BlockNote) ; le texte grec
// et français est résolu en direct depuis les JSON publics, jamais figé dans le bloc.
export const verseQuoteBlock = createReactBlockSpec(
  {
    type: "verseQuote",
    propSchema: {
      corpus: { default: "nt" },
      book: { default: "" },
      chapter: { default: 1 },
      verseStart: { default: 1 },
      verseEnd: { default: 1 },
      showFrench: { default: true },
    },
    content: "none",
  },
  {
    render: ({ block, editor }) => {
      const p = block.props as VerseQuoteProps;
      return (
        <VerseQuoteBlockView
          props={p}
          editable={editor.isEditable}
          onToggleFrench={(showFrench) => editor.updateBlock(block, { props: { showFrench } })}
          onEdit={(edit) => edit(block.id, p)}
        />
      );
    },
  },
);

function VerseQuoteBlockView({
  props,
  editable,
  onToggleFrench,
  onEdit,
}: {
  props: VerseQuoteProps;
  editable: boolean;
  onToggleFrench: (showFrench: boolean) => void;
  onEdit: (edit: (blockId: string, props: VerseQuoteProps) => void) => void;
}) {
  const [verses, setVerses] = useState<VerseLine[] | null>(null);
  const citation = useCitation();

  useEffect(() => {
    if (!props.book) {
      setVerses([]);
      return;
    }
    let alive = true;
    loadChapterVerses(props.corpus, props.book, props.chapter)
      .then((bv) => alive && setVerses(sliceVerses(bv, props.verseStart, props.verseEnd)))
      .catch(() => alive && setVerses([]));
    return () => {
      alive = false;
    };
  }, [props.corpus, props.book, props.chapter, props.verseStart, props.verseEnd]);

  return (
    <div contentEditable={false} className="my-1">
      <VerseQuoteView {...props} verses={verses} linked={false} />
      {editable && (
        <div className="mt-1 flex items-center gap-3 text-xs text-base-content/60">
          <button type="button" className="link" onClick={() => citation && onEdit(citation.editVerse)}>
            Modifier
          </button>
          <label className="flex cursor-pointer items-center gap-1">
            <input type="checkbox" className="checkbox checkbox-xs" checked={props.showFrench} onChange={(e) => onToggleFrench(e.target.checked)} />
            Traduction
          </label>
        </div>
      )}
    </div>
  );
}
