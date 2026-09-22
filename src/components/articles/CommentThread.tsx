"use client";

import { useState } from "react";
import Avatar from "@/src/components/profile/Avatar";
import type { ArticleComment } from "@/lib/articles";

export default function CommentThread({
  excerpt,
  comments,
  canComment,
  onAdd,
  onResolveThread,
  onClose,
  userId,
  onEdit,
  orphaned,
}: {
  excerpt: string | null;
  comments: ArticleComment[];
  canComment: boolean;
  onAdd: (text: string) => Promise<void>;
  onResolveThread: (resolved: boolean) => Promise<void>;
  onClose: () => void;
  userId: number;
  onEdit: (commentId: string, text: string | null) => Promise<void>;
  orphaned: boolean;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unresolved = comments.some((comment) => !comment.resolved);
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const update = async (commentId: string, value: string | null) => {
    setBusy(true);
    setError(null);
    try {
      await onEdit(commentId, value);
      setEditing(null);
      setDeleting(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onAdd(text.trim());
      setText("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const toggleResolved = async () => {
    if (!comments.length || resolving) return;
    setResolving(true);
    setError(null);
    try {
      await onResolveThread(unresolved);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setResolving(false);
    }
  };

  return (
    <section
      className="overflow-hidden rounded-xl border border-base-300 bg-base-100 shadow-xl lg:shadow-sm"
      aria-label="Fil de commentaires"
    >
      <header className="border-b border-base-200 bg-base-200/35 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-base-content/45">
              {excerpt ? "Passage commenté" : "Discussion générale"}
            </p>
            {excerpt && (
              <p className="mt-1 line-clamp-2 text-sm italic leading-snug text-base-content/70">
                « {excerpt} »
              </p>
            )}
            {orphaned && (
              <p className="mt-1 text-xs text-warning">
                Passage supprimé · citation conservée
              </p>
            )}
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-circle btn-sm shrink-0"
            onClick={onClose}
            aria-label="Retour à la revue"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        </div>
        {comments.length > 0 && (
          <div className="mt-3 flex items-center justify-between gap-2">
            <span
              className={`badge badge-sm ${unresolved ? "badge-warning" : "badge-success"}`}
            >
              {unresolved ? "En cours" : "Résolu"}
            </span>
            {canComment && (
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                disabled={resolving}
                onClick={toggleResolved}
              >
                {resolving
                  ? "Mise à jour…"
                  : unresolved
                    ? "Résoudre le fil"
                    : "Rouvrir le fil"}
              </button>
            )}
          </div>
        )}
      </header>

      <ul className="max-h-[46dvh] space-y-4 overflow-y-auto px-4 py-4 lg:max-h-80">
        {comments.length === 0 && (
          <li className="text-sm text-base-content/55">
            Commencez cette discussion.
          </li>
        )}
        {comments.map((comment) => (
          <li key={comment.id} className="flex gap-2.5">
            <Avatar
              name={comment.author.name || "Contributeur"}
              photo={null}
              size={28}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-2 text-xs">
                <span className="font-semibold">
                  {comment.author.name || "Contributeur"}
                </span>
                <time className="text-base-content/40">
                  {new Date(comment.createdAt).toLocaleString("fr-FR", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </div>
              {editing === comment.id ? (
                <div className="mt-2 space-y-2">
                  <textarea
                    aria-label="Modifier mon commentaire"
                    className="textarea textarea-bordered w-full"
                    value={editText}
                    maxLength={10000}
                    onChange={(e) => setEditText(e.target.value)}
                  />
                  <button
                    disabled={busy || !editText.trim()}
                    className="btn btn-primary btn-xs"
                    onClick={() => update(comment.id, editText)}
                  >
                    Enregistrer
                  </button>
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={() => setEditing(null)}
                  >
                    Annuler
                  </button>
                </div>
              ) : (
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-base-content/90">
                  {comment.deletedAt ? "Message supprimé" : comment.text}
                </p>
              )}
              {comment.editedAt && !comment.deletedAt && (
                <span className="text-[10px] text-base-content/50">
                  Modifié
                </span>
              )}
              {canComment &&
                comment.author.userId === userId &&
                !comment.deletedAt &&
                !editing && (
                  <div className="mt-1 flex gap-2">
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={() => {
                        setEditing(comment.id);
                        setEditText(comment.text);
                      }}
                    >
                      Modifier
                    </button>
                    <button
                      className="btn btn-ghost btn-xs text-error"
                      onClick={() => setDeleting(comment.id)}
                    >
                      Supprimer
                    </button>
                  </div>
                )}
              {deleting === comment.id && (
                <div className="mt-2 rounded bg-base-200 p-2 text-xs">
                  <p>Supprimer ce message ? Une trace restera dans le fil.</p>
                  <button
                    disabled={busy}
                    className="btn btn-error btn-xs mt-1"
                    onClick={() => update(comment.id, null)}
                  >
                    Confirmer
                  </button>
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={() => setDeleting(null)}
                  >
                    Annuler
                  </button>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>

      {canComment && (
        <div className="border-t border-base-200 p-3">
          <label className="sr-only" htmlFor="thread-reply">
            Répondre dans ce fil
          </label>
          <textarea
            id="thread-reply"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
              if (e.key === "Escape") onClose();
            }}
            rows={3}
            maxLength={10000}
            placeholder={
              comments.length ? "Écrire une réponse…" : "Écrire un commentaire…"
            }
            className="textarea textarea-bordered w-full resize-none text-sm"
          />
          {error && (
            <p className="mt-1 text-xs text-error" role="alert">
              {error}
            </p>
          )}
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-[10px] text-base-content/40">
              Ctrl/⌘ + Entrée
            </span>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={!text.trim() || busy}
              onClick={submit}
            >
              {busy ? "Envoi…" : comments.length ? "Répondre" : "Commenter"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
