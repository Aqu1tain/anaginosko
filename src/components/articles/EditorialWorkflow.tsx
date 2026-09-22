"use client";
import { useEffect, useState } from "react";
import type { Article, TransitionAction } from "@/lib/articles";
import { can, type AuthUser } from "@/src/lib/api";
import { fetchReviewers } from "@/src/lib/articlesApi";
import dynamic from "next/dynamic";
const ArticleEditor = dynamic(() => import("./ArticleEditor"), { ssr: false });
function ArticleRenderer({ content }: { content: unknown[] }) {
  return (
    <ArticleEditor
      articleId="preview"
      initialContent={content}
      editable={false}
      dark={false}
      onChange={() => {}}
    />
  );
}

export default function EditorialWorkflow({
  article: a,
  user,
  onAction,
}: {
  article: Article;
  user: AuthUser;
  onAction: (
    action: TransitionAction | "retry_notification",
    note?: string,
    reviewerId?: number | null,
  ) => Promise<void>;
}) {
  const [reviewers, setReviewers] = useState<
    Awaited<ReturnType<typeof fetchReviewers>>
  >([]);
  const [directoryError, setDirectoryError] = useState("");
  const [reviewerId, setReviewerId] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [compare, setCompare] = useState(false);
  useEffect(() => {
    fetchReviewers()
      .then(setReviewers)
      .catch((e) => setDirectoryError(e.message));
  }, []);
  const author = a.author.userId === user.id;
  const review =
    can(user, "review") &&
    !author &&
    (a.reviewRequest?.reviewerId == null ||
      a.reviewRequest.reviewerId === user.id);
  const publish = can(user, "publish");
  const act = async (action: TransitionAction | "retry_notification") => {
    setBusy(true);
    setError("");
    try {
      await onAction(action, note, reviewerId ? Number(reviewerId) : null);
      setNote("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const button = (
    action: TransitionAction | "retry_notification",
    label: string,
    primary = false,
  ) => (
    <button
      key={action}
      type="button"
      className={`btn btn-sm w-full ${primary ? "btn-primary" : "btn-outline"}`}
      disabled={busy}
      onClick={() => act(action)}
    >
      {label}
    </button>
  );
  const base =
    a.publishedVersion ??
    a.versions.findLast((v) => v.revision < a.contentRevision);
  return (
    <section
      className="space-y-3 rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm"
      aria-label="Circuit de publication"
    >
      <h2 className="font-semibold">
        Publication · version {a.contentRevision}
      </h2>
      <p className="text-xs text-base-content/65">
        Une approbation par un autre relecteur est obligatoire, y compris pour
        les administrateurs.
      </p>
      {a.publishedVersion && (
        <p className="rounded-lg bg-success/10 p-2 text-xs">
          La version {a.publishedVersion.revision} reste en ligne.{" "}
          <a
            className="link"
            href={`/articles/${a.publishedVersion.slug}`}
            target="_blank"
            rel="noreferrer"
          >
            Voir l’article public
          </a>
        </p>
      )}
      {a.reviewRequest && (
        <div className="text-sm">
          <p>
            Relecture :{" "}
            <strong>
              {a.reviewRequest.reviewerName ?? "File commune des relecteurs"}
            </strong>
          </p>
          {a.reviewRequest.note && (
            <p className="mt-1 whitespace-pre-wrap text-xs text-base-content/70">
              {a.reviewRequest.note}
            </p>
          )}
          {a.reviewRequest.revision !== a.contentRevision && (
            <p className="text-warning">
              Le texte a changé depuis cette demande.
            </p>
          )}
          {a.reviewRequest.notification === "sent" && (
            <p className="text-xs text-base-content/60">
              Demande envoyée par e-mail.
            </p>
          )}
          {author &&
            a.status === "in_review" &&
            ["failed", "pending"].includes(a.reviewRequest.notification) && (
              <div
                role="status"
                className="mt-2 space-y-2 text-xs text-warning"
              >
                <p>Demande enregistrée ; envoi de l’e-mail à réessayer.</p>
                {button("retry_notification", "Réessayer l’e-mail")}
              </div>
            )}
        </div>
      )}
      {a.approval && (
        <p className="rounded-lg bg-success/10 p-2 text-sm">
          Version {a.approval.revision} approuvée par {a.approval.name}.
        </p>
      )}
      {a.status === "changes_requested" && (
        <p className="whitespace-pre-wrap rounded-lg bg-warning/10 p-2 text-sm">
          {a.events.filter((e) => e.type === "changes_requested").at(-1)?.note}
        </p>
      )}
      {author &&
        can(user, "articles") &&
        ["draft", "changes_requested"].includes(a.status) && (
          <>
            <label className="block text-sm">
              Demander à
              <select
                className="select select-bordered mt-1 w-full"
                value={reviewerId}
                onChange={(e) => setReviewerId(e.target.value)}
              >
                <option value="">File commune</option>
                {reviewers
                  .filter((r) => r.id !== user.id)
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.displayName} — {r.title}
                    </option>
                  ))}
              </select>
            </label>
            {directoryError && (
              <p role="alert" className="text-xs text-error">
                {directoryError}
              </p>
            )}
            {!directoryError && !reviewers.some((r) => r.id !== user.id) && (
              <p className="text-xs text-warning">
                Aucun autre relecteur actif. Un second compte devra être invité
                pour approuver.
              </p>
            )}
          </>
        )}
      {((author && ["draft", "changes_requested"].includes(a.status)) ||
        (review && a.status === "in_review")) && (
        <label className="block text-sm">
          Message / corrections attendues
          <textarea
            className="textarea textarea-bordered mt-1 w-full"
            rows={3}
            maxLength={10000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
      )}
      <div className="space-y-2">
        {author &&
          can(user, "articles") &&
          ["draft", "changes_requested"].includes(a.status) &&
          button("submit", "Demander une relecture", true)}
        {review &&
          a.status === "in_review" &&
          button("approve", "Approuver cette version", true)}
        {review &&
          a.status === "in_review" &&
          button("request_changes", "Demander des corrections")}
        {publish &&
          a.status === "approved" &&
          button("publish", "Publier la version approuvée", true)}
        {author &&
          can(user, "articles") &&
          ["published", "approved", "in_review"].includes(a.status) &&
          button(
            "revise",
            a.status === "published"
              ? "Préparer une modification"
              : "Reprendre / changer de relecteur",
          )}
        {publish && a.publishedVersion && button("unpublish", "Dépublier")}
        {publish && a.status !== "archived" && button("archive", "Archiver")}
        {publish &&
          a.status === "archived" &&
          button("restore", "Restaurer en brouillon")}
      </div>
      {error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}
      {base && (
        <details
          open={compare}
          onToggle={(e) => setCompare(e.currentTarget.open)}
        >
          <summary className="cursor-pointer text-sm font-medium">
            Comparer avec la version {base.revision}
          </summary>
          {compare && (
            <div className="mt-3 space-y-4 max-h-96 overflow-auto text-sm">
              <section aria-label="Version de référence">
                <h3 className="font-semibold">Référence — {base.title}</h3>
                <p>{base.excerpt}</p>
                <ArticleRenderer
                  key={`base-${base.revision}`}
                  content={base.content}
                />
              </section>
              <section aria-label="Version en cours">
                <h3 className="font-semibold">En cours — {a.title}</h3>
                <p>{a.excerpt}</p>
                <ArticleRenderer
                  key={`current-${a.contentRevision}`}
                  content={a.content}
                />
              </section>
            </div>
          )}
        </details>
      )}
      {a.versions.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm">
            Versions soumises ({a.versions.length})
          </summary>
          <ul className="mt-2 space-y-2">
            {a.versions.map((v, i) => (
              <li key={i}>
                <details>
                  <summary className="cursor-pointer text-xs">
                    Version {v.revision} ·{" "}
                    {new Date(v.savedAt).toLocaleString("fr-FR")}
                  </summary>
                  <div className="mt-2 max-h-80 overflow-auto">
                    <h3 className="font-semibold">{v.title}</h3>
                    <p>{v.excerpt}</p>
                    <ArticleRenderer content={v.content} />
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
