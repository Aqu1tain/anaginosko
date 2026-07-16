"use client";

import { useState } from "react";
import type { ArticleComment } from "@/lib/articles";

// Fil de revue façon GitHub : commentaires généraux ou ancrés à un bloc, résolubles.
// L'ancrage se fait en cliquant un bloc de l'article (capté par le workbench).
export default function ReviewPanel({
  comments,
  canComment,
  lastBlockId,
  onAdd,
  onResolve,
  onJumpTo,
}: {
  comments: ArticleComment[];
  canComment: boolean;
  lastBlockId: string | null;
  onAdd: (text: string, blockId: string | null) => Promise<void>;
  onResolve: (commentId: string, resolved: boolean) => Promise<void>;
  onJumpTo: (blockId: string) => void;
}) {
  const [text, setText] = useState("");
  const [anchor, setAnchor] = useState(false);
  const [busy, setBusy] = useState(false);
  const unresolved = comments.filter((c) => !c.resolved).length;

  const submit = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      await onAdd(text.trim(), anchor ? lastBlockId : null);
      setText("");
      setAnchor(false);
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
                Aller au passage commenté
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
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Commentaire…"
            rows={3}
            className="textarea textarea-bordered w-full text-sm"
          />
          <label className={`mt-1 flex items-center gap-2 text-xs ${lastBlockId ? "" : "opacity-40"}`}>
            <input type="checkbox" className="checkbox checkbox-xs" checked={anchor} disabled={!lastBlockId} onChange={(e) => setAnchor(e.target.checked)} />
            Ancrer au passage sélectionné
          </label>
          <button className="btn btn-primary btn-sm mt-2 w-full" disabled={!text.trim() || busy} onClick={submit}>
            Commenter
          </button>
        </div>
      )}
    </div>
  );
}
