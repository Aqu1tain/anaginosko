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
  onOpenThread: (blockId: string | null, threadId?: string) => void;
}) {
  const [filter, setFilter] = useState("open");
  const threads = useMemo(
    () =>
      [...new Map(comments.map((c) => [c.threadId, c])).values()].map((c) => ({
        ...c,
        count: comments.filter((m) => m.threadId === c.threadId && !m.deletedAt)
          .length,
        resolved: comments
          .filter((m) => m.threadId === c.threadId)
          .every((m) => m.resolved),
      })),
    [comments],
  );
  return (
    <section aria-label="Discussions de relecture">
      <h2 className="text-sm font-semibold">
        Discussions · {threads.filter((t) => !t.resolved).length} en cours
      </h2>
      <div className="my-3 flex gap-1">
        {[
          ["open", "En cours"],
          ["resolved", "Résolues"],
          ["all", "Toutes"],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={filter === key}
            className={`btn btn-xs ${filter === key ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {threads
          .filter(
            (t) =>
              filter === "all" ||
              (filter === "resolved" ? t.resolved : !t.resolved),
          )
          .map((t) => (
            <button
              key={t.threadId}
              className="block w-full rounded-lg border border-base-300 p-3 text-left text-xs hover:bg-base-200"
              onClick={() => onOpenThread(t.blockId, t.threadId)}
            >
              <span className="block font-medium">
                {t.blockId
                  ? t.quote || excerptFor(t.blockId) || "Passage supprimé"
                  : "Discussion générale"}
              </span>
              {t.blockId && !excerptFor(t.blockId) && (
                <span className="block text-warning">
                  Passage supprimé · citation conservée
                </span>
              )}
              <span className="mt-1 block text-base-content/60">
                {t.count} message(s) · version {t.revision} ·{" "}
                {t.resolved ? "Résolue" : "En cours"}
              </span>
            </button>
          ))}
        {!threads.length && (
          <p className="text-xs text-base-content/60">
            Sélectionnez du texte pour démarrer une discussion, ou commentez un
            passage ci-dessous.
          </p>
        )}
      </div>
      {canComment && (
        <div className="mt-3 space-y-2 border-t border-base-200 pt-3">
          <button
            className="btn btn-outline btn-sm w-full"
            onClick={() => onOpenThread(null)}
          >
            Nouvelle discussion générale
          </button>
          <details>
            <summary className="cursor-pointer text-sm">
              Commenter un passage
            </summary>
            <div className="mt-2 max-h-56 overflow-y-auto">
              {passages.map((p) => (
                <button
                  key={p.blockId}
                  className="block w-full rounded p-2 text-left text-xs hover:bg-base-200"
                  onClick={() => onOpenThread(p.blockId)}
                >
                  {p.excerpt}
                </button>
              ))}
            </div>
          </details>
        </div>
      )}
    </section>
  );
}
