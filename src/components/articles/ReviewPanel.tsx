"use client";

import { useMemo, useState } from "react";
import type { ArticleComment } from "@/lib/articles";

// Panneau de revue : discussion générale de l'article + sommaire des fils ancrés
// aux lignes. Les fils eux-mêmes s'ouvrent SUR la ligne (CommentThread flottant),
// pas ici : cliquer une entrée du sommaire y mène.
export default function ReviewPanel({
  comments,
  canComment,
  excerptFor,
  onAddGeneral,
  onResolve,
  onOpenThread,
}: {
  comments: ArticleComment[];
  canComment: boolean;
  excerptFor: (blockId: string) => string | null;
  onAddGeneral: (text: string) => Promise<void>;
  onResolve: (commentId: string, resolved: boolean) => Promise<void>;
  onOpenThread: (blockId: string) => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const general = useMemo(() => comments.filter((c) => !c.blockId), [comments]);
  const threads = useMemo(() => {
    const map = new Map<string, ArticleComment[]>();
    for (const c of comments) if (c.blockId) map.set(c.blockId, [...(map.get(c.blockId) ?? []), c]);
    return [...map.entries()].map(([blockId, cs]) => ({
      blockId,
      count: cs.length,
      unresolved: cs.filter((c) => !c.resolved).length,
      last: cs[cs.length - 1],
    }));
  }, [comments]);
  const unresolvedTotal = comments.filter((c) => !c.resolved).length;

  const submit = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      await onAddGeneral(text.trim());
      setText("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-base-content/60">Revue</h2>
        {unresolvedTotal > 0 && <span className="badge badge-warning badge-sm">{unresolvedTotal} en cours</span>}
      </div>

      {threads.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {threads.map((t) => (
            <li key={t.blockId}>
              <button
                type="button"
                onClick={() => onOpenThread(t.blockId)}
                className="flex w-full items-center gap-2 rounded-lg border border-base-200 px-2.5 py-2 text-left text-xs transition-colors hover:border-base-300 hover:bg-base-200/50"
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${t.unresolved ? "bg-warning" : "bg-success"}`} />
                <span className="min-w-0 flex-1 truncate italic text-base-content/60">
                  {excerptFor(t.blockId) ? `« ${excerptFor(t.blockId)} »` : "Ligne supprimée"}
                </span>
                <span className="shrink-0 text-base-content/45">{t.count}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-base-content/45">Discussion générale</h3>
        <ul className="mt-2 space-y-3">
          {general.length === 0 && <li className="text-xs text-base-content/50">Aucun commentaire général.</li>}
          {general.map((c) => (
            <li key={c.id} className={`rounded-lg border p-2.5 text-sm ${c.resolved ? "border-base-200 opacity-60" : "border-base-300"}`}>
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold">{c.author.name || "Contributeur"}</span>
                <time className="text-base-content/45">{new Date(c.createdAt).toLocaleDateString("fr-FR")}</time>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-base-content/90">{c.text}</p>
              {canComment && (
                <button
                  type="button"
                  className="mt-1.5 text-[11px] text-base-content/55 hover:underline"
                  onClick={() => onResolve(c.id, !c.resolved)}
                >
                  {c.resolved ? "Rouvrir" : "Résoudre"}
                </button>
              )}
            </li>
          ))}
        </ul>
        {canComment && (
          <div className="mt-2.5">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
              }}
              rows={2}
              placeholder="Commentaire général sur l'article…"
              className="textarea textarea-bordered w-full text-sm"
            />
            <button className="btn btn-primary btn-sm mt-2 w-full" disabled={!text.trim() || busy} onClick={submit}>
              Commenter
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
