"use client";

import { useState } from "react";
import { createReactBlockSpec } from "@blocknote/react";
import EmbedView from "../EmbedView";
import { normalizeEmbedUrl, EMBED_ALLOWLIST } from "@/src/data/embed";

// Bloc d'intégration (carte, vidéo, graphique). L'URL saisie est validée contre la
// liste blanche avant d'être stockée ; le rendu public la revalide (défense en profondeur).
export const embedBlock = createReactBlockSpec(
  {
    type: "embed",
    propSchema: { url: { default: "" }, title: { default: "" } },
    content: "none",
  },
  {
    render: ({ block, editor }) => (
      <EmbedBlockView
        url={String(block.props.url)}
        title={String(block.props.title)}
        editable={editor.isEditable}
        onSet={(url, title) => editor.updateBlock(block, { props: { url, title } })}
      />
    ),
  },
);

function EmbedBlockView({
  url,
  title,
  editable,
  onSet,
}: {
  url: string;
  title: string;
  editable: boolean;
  onSet: (url: string, title: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (url) {
    return (
      <div contentEditable={false} className="my-1">
        <EmbedView src={url} title={title} />
        {editable && (
          <button type="button" className="link text-xs text-base-content/60" onClick={() => onSet("", "")}>
            Retirer l&apos;intégration
          </button>
        )}
      </div>
    );
  }
  if (!editable) return <div contentEditable={false} />;

  const submit = () => {
    const normalized = normalizeEmbedUrl(draft);
    if (!normalized) {
      setError(`Domaine non autorisé. Sources acceptées : ${EMBED_ALLOWLIST}.`);
      return;
    }
    setError(null);
    onSet(normalized, title);
  };

  return (
    <div contentEditable={false} className="my-1 rounded-lg border border-dashed border-base-300 p-4">
      <p className="text-sm font-medium">Intégrer une carte, une vidéo ou un graphique</p>
      <div className="mt-2 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Coller le lien d'intégration"
          className="input input-bordered input-sm w-full"
        />
        <button type="button" className="btn btn-primary btn-sm" onClick={submit}>
          Intégrer
        </button>
      </div>
      {error ? (
        <p className="mt-2 text-xs text-error">{error}</p>
      ) : (
        <p className="mt-2 text-xs text-base-content/50">Sources : {EMBED_ALLOWLIST}.</p>
      )}
    </div>
  );
}
