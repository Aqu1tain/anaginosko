"use client";

import { useState } from "react";
import type { ArticleComment } from "@/lib/articles";

// Fil de commentaires flottant, ancré visuellement à une ligne de l'article
// (façon Google Docs) : lecture du fil, réponse et résolution sur place.
export default function CommentThread({
  excerpt,
  comments,
  canComment,
  onAdd,
  onResolve,
  onClose,
}: {
  excerpt: string | null;
  comments: ArticleComment[];
  canComment: boolean;
  onAdd: (text: string) => Promise<void>;
  onResolve: (id: string, resolved: boolean) => Promise<void>;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      await onAdd(text.trim());
      setText("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-base-300 bg-base-100 shadow-xl">
      <div className="flex items-start justify-between gap-2 border-b border-base-200 bg-base-200/40 px-3 py-2">
        <p className="min-w-0 truncate text-xs italic text-base-content/55">
          {excerpt ? `« ${excerpt} »` : "Ligne commentée"}
        </p>
        <button type="button" className="text-base-content/50 hover:text-base-content" onClick={onClose} aria-label="Fermer le fil">
          ✕
        </button>
      </div>

      <ul className="max-h-64 space-y-3 overflow-y-auto px-3 py-2.5">
        {comments.length === 0 && <li className="text-xs text-base-content/50">Commencez le fil sur cette ligne.</li>}
        {comments.map((c) => (
          <li key={c.id} className={c.resolved ? "opacity-55" : ""}>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold">{c.author.name || "Contributeur"}</span>
              <time className="text-base-content/45">{new Date(c.createdAt).toLocaleDateString("fr-FR")}</time>
            </div>
            <p className="mt-0.5 whitespace-pre-wrap text-sm leading-snug">{c.text}</p>
            {canComment && (
              <button
                type="button"
                className="mt-0.5 text-[11px] text-base-content/55 hover:underline"
                onClick={() => onResolve(c.id, !c.resolved)}
              >
                {c.resolved ? "Rouvrir" : "Résoudre"}
              </button>
            )}
          </li>
        ))}
      </ul>

      {canComment && (
        <div className="border-t border-base-200 p-2.5">
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
              if (e.key === "Escape") onClose();
            }}
            rows={2}
            placeholder={comments.length ? "Répondre…" : "Votre commentaire…"}
            className="textarea textarea-bordered w-full text-sm"
          />
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-[10px] text-base-content/40">⌘⏎ pour envoyer</span>
            <button type="button" className="btn btn-primary btn-xs" disabled={!text.trim() || busy} onClick={submit}>
              Commenter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
