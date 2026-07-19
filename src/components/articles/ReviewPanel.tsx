"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ArticleComment } from "@/lib/articles";

// Fil de revue façon GitHub. Cliquer une ligne de l'article la met en contexte :
// le composeur (en tête de panneau) s'y ancre et prend le focus. Chaque commentaire
// ancré cite un extrait de sa ligne ; les non-résolus sont listés d'abord.
export default function ReviewPanel({
  comments,
  canComment,
  selectable,
  selected,
  highlightId,
  excerptFor,
  onClearSelected,
  onAdd,
  onResolve,
  onJumpTo,
}: {
  comments: ArticleComment[];
  canComment: boolean;
  // Sélection de ligne possible seulement en relecture (éditeur en lecture seule).
  selectable: boolean;
  selected: { id: string; excerpt: string } | null;
  highlightId: string | null;
  excerptFor: (blockId: string) => string | null;
  onClearSelected: () => void;
  onAdd: (text: string, blockId: string | null) => Promise<void>;
  onResolve: (commentId: string, resolved: boolean) => Promise<void>;
  onJumpTo: (blockId: string) => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const unresolved = comments.filter((c) => !c.resolved).length;

  // Une ligne vient d'être sélectionnée : le composeur prend la main.
  useEffect(() => {
    if (selected) composerRef.current?.focus();
  }, [selected]);

  // Le fil ciblé par une pastille de marge est amené à l'écran et surligné.
  useEffect(() => {
    if (!highlightId) return;
    document.getElementById(`comment-${highlightId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightId]);

  const ordered = useMemo(
    () => [...comments.filter((c) => !c.resolved), ...comments.filter((c) => c.resolved)],
    [comments],
  );

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

      {canComment && (
        <div className="mt-3">
          {selected ? (
            <div className="mb-1 flex items-start justify-between gap-2 rounded-t-lg border border-b-0 border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs text-primary">
              <span className="min-w-0 truncate italic">« {selected.excerpt || "(ligne vide)"} »</span>
              <button type="button" onClick={onClearSelected} className="shrink-0 hover:underline">
                ✕
              </button>
            </div>
          ) : selectable ? (
            <p className="mb-1 text-xs text-base-content/50">
              Cliquez une ligne de l&apos;article pour la commenter, ou écrivez un commentaire général.
            </p>
          ) : null}
          <textarea
            ref={composerRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
            }}
            placeholder={selected ? "Commenter cette ligne…" : "Commentaire général…"}
            rows={3}
            className={`textarea textarea-bordered w-full text-sm ${selected ? "rounded-t-none border-primary/40" : ""}`}
          />
          <button className="btn btn-primary btn-sm mt-2 w-full" disabled={!text.trim() || busy} onClick={submit}>
            Commenter
          </button>
        </div>
      )}

      <ul className="mt-4 space-y-3">
        {ordered.length === 0 && <li className="text-sm text-base-content/50">Aucun commentaire.</li>}
        {ordered.map((c) => {
          const excerpt = c.blockId ? excerptFor(c.blockId) : null;
          return (
            <li
              key={c.id}
              id={`comment-${c.id}`}
              className={`rounded-lg border p-3 text-sm transition-shadow ${
                c.resolved ? "border-base-200 opacity-60" : "border-base-300"
              } ${highlightId === c.id ? "ring-2 ring-primary" : ""}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{c.author.name || "Contributeur"}</span>
                <time className="text-xs text-base-content/45">{new Date(c.createdAt).toLocaleDateString("fr-FR")}</time>
              </div>
              {c.blockId && (
                <button
                  type="button"
                  onClick={() => onJumpTo(c.blockId!)}
                  className="mt-1.5 block w-full truncate rounded border-l-2 border-primary/50 bg-base-200/60 px-2 py-1 text-left text-xs italic text-base-content/60 hover:bg-base-200"
                  title="Voir la ligne dans l'article"
                >
                  {excerpt ? `« ${excerpt} »` : "Ligne supprimée depuis"}
                </button>
              )}
              <p className="mt-1.5 whitespace-pre-wrap text-base-content/90">{c.text}</p>
              {canComment && (
                <button
                  type="button"
                  className="mt-2 text-xs text-base-content/60 hover:underline"
                  onClick={() => onResolve(c.id, !c.resolved)}
                >
                  {c.resolved ? "Rouvrir" : "Marquer résolu"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
