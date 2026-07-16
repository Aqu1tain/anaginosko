"use client";

import { useState } from "react";
import type { ArticleComment } from "@/lib/articles";

// Fil de revue façon GitHub. Commentaire ligne par ligne : cliquer une ligne de
// l'article la sélectionne, le commentaire s'y attache ; sinon il est général.
export default function ReviewPanel({
  comments,
  canComment,
  selected,
  onClearSelected,
  onAdd,
  onResolve,
  onJumpTo,
}: {
  comments: ArticleComment[];
  canComment: boolean;
  selected: { id: string; excerpt: string } | null;
  onClearSelected: () => void;
  onAdd: (text: string, blockId: string | null) => Promise<void>;
  onResolve: (commentId: string, resolved: boolean) => Promise<void>;
  onJumpTo: (blockId: string) => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const unresolved = comments.filter((c) => !c.resolved).length;

  const submit = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      await onAdd(text.trim(), selected?.id ?? null);
      setText("");
      onClearSelected();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-base-content/60">Revue</h2>
        {unresolved > 0 && <span className="badge badge-warning badge-sm">{unresolved} en cours</span>}
      </div>

      <ul className="mt-3 space-y-3">
        {comments.length === 0 && <li className="text-sm text-base-content/50">Aucun commentaire.</li>}
        {comments.map((c) => (
          <li key={c.id} className={`rounded-lg border p-3 text-sm ${c.resolved ? "border-base-200 opacity-60" : "border-base-300"}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{c.author.name || "Contributeur"}</span>
              <time className="text-xs text-base-content/45">{new Date(c.createdAt).toLocaleDateString("fr-FR")}</time>
            </div>
            {c.blockId && (
              <button type="button" className="mt-1 text-xs text-primary hover:underline" onClick={() => onJumpTo(c.blockId!)}>
                Voir la ligne commentée
              </button>
            )}
            <p className="mt-1 whitespace-pre-wrap text-base-content/90">{c.text}</p>
            {canComment && (
              <button type="button" className="mt-2 text-xs text-base-content/60 hover:underline" onClick={() => onResolve(c.id, !c.resolved)}>
                {c.resolved ? "Rouvrir" : "Marquer résolu"}
              </button>
            )}
          </li>
        ))}
      </ul>

      {canComment && (
        <div className="mt-4">
          {selected ? (
            <div className="mb-1 flex items-start justify-between gap-2 rounded bg-primary/10 px-2 py-1.5 text-xs text-primary">
              <span className="min-w-0">
                Sur la ligne : <span className="italic opacity-80">« {selected.excerpt || "(vide)"} »</span>
              </span>
              <button type="button" onClick={onClearSelected} className="shrink-0 hover:underline">
                Général
              </button>
            </div>
          ) : (
            <p className="mb-1 text-xs text-base-content/50">Cliquez une ligne de l&apos;article pour la commenter, ou écrivez un commentaire général.</p>
          )}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={selected ? "Commenter cette ligne…" : "Commentaire général…"}
            rows={3}
            className="textarea textarea-bordered w-full text-sm"
          />
          <button className="btn btn-primary btn-sm mt-2 w-full" disabled={!text.trim() || busy} onClick={submit}>
            Commenter
          </button>
        </div>
      )}
    </div>
  );
}
