"use client";

import { useMemo, useState } from "react";
import type { ArticleComment } from "@/lib/articles";

export type ReviewPassage = { blockId: string; excerpt: string };

export default function ReviewPanel({
  comments,
  canComment,
  passages,
  excerptFor,
  onOpenThread,
}: {
  comments: ArticleComment[];
  canComment: boolean;
  passages: ReviewPassage[];
  excerptFor: (blockId: string) => string | null;
  onOpenThread: (blockId: string | null) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const general = useMemo(() => comments.filter((comment) => !comment.blockId), [comments]);
  const threads = useMemo(() => {
    const map = new Map<string, ArticleComment[]>();
    for (const comment of comments) {
      if (comment.blockId) map.set(comment.blockId, [...(map.get(comment.blockId) ?? []), comment]);
    }
    return [...map.entries()].map(([blockId, threadComments]) => ({
      blockId,
      count: threadComments.length,
      unresolved: threadComments.some((comment) => !comment.resolved),
    }));
  }, [comments]);
  const unresolvedTotal = comments.filter((comment) => !comment.resolved).length;

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-base-content/60">Revue</h2>
        <span className={`badge badge-sm ${unresolvedTotal ? "badge-warning" : "badge-ghost"}`}>
          {unresolvedTotal ? `${unresolvedTotal} en cours` : "À jour"}
        </span>
      </div>

      <div className="mt-3 space-y-2">
        <ThreadButton
          label="Discussion générale"
          count={general.length}
          unresolved={general.some((comment) => !comment.resolved)}
          emptyLabel="Commencer"
          onClick={() => onOpenThread(null)}
        />
        {threads.map((thread) => (
          <ThreadButton
            key={thread.blockId}
            label={excerptFor(thread.blockId) ? `« ${excerptFor(thread.blockId)} »` : "Passage supprimé"}
            count={thread.count}
            unresolved={thread.unresolved}
            onClick={() => onOpenThread(thread.blockId)}
          />
        ))}
      </div>

      {canComment && (
        <div className="mt-3 border-t border-base-200 pt-3">
          <button
            type="button"
            className="btn btn-ghost btn-sm w-full justify-between"
            aria-expanded={pickerOpen}
            onClick={() => setPickerOpen((open) => !open)}
          >
            Commenter un passage
            <span aria-hidden="true">{pickerOpen ? "−" : "+"}</span>
          </button>
          {pickerOpen && (
            <div className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-lg bg-base-200/35 p-1.5">
              {passages.length === 0 ? (
                <p className="px-2 py-3 text-xs text-base-content/50">Aucun passage disponible.</p>
              ) : (
                passages.map((passage) => (
                  <button
                    key={passage.blockId}
                    type="button"
                    className="w-full rounded-md px-2.5 py-2 text-left text-xs leading-relaxed text-base-content/70 hover:bg-base-100 hover:text-base-content"
                    onClick={() => {
                      setPickerOpen(false);
                      onOpenThread(passage.blockId);
                    }}
                  >
                    {passage.excerpt}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ThreadButton({
  label,
  count,
  unresolved,
  emptyLabel,
  onClick,
}: {
  label: string;
  count: number;
  unresolved: boolean;
  emptyLabel?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg border border-base-200 px-3 py-2.5 text-left text-xs transition-colors hover:border-base-300 hover:bg-base-200/50"
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${count === 0 ? "bg-base-300" : unresolved ? "bg-warning" : "bg-success"}`} />
      <span className={`min-w-0 flex-1 truncate ${label.startsWith("«") ? "italic text-base-content/65" : "font-medium"}`}>{label}</span>
      <span className="shrink-0 text-base-content/45">{count || emptyLabel}</span>
      <span aria-hidden="true" className="text-base-content/35">›</span>
    </button>
  );
}
