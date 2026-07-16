"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/src/hooks/useAuth";
import { fetchArticles, createArticle } from "@/src/lib/articlesApi";
import type { ArticleSummary, ArticleCategory, ArticleStatus, ArticleSignature } from "@/lib/articles";
import { STATUS_LABEL, STATUS_BADGE, CATEGORY_LABEL } from "./labels";

const FILTERS: { key: "all" | ArticleStatus; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "draft", label: "Brouillons" },
  { key: "in_review", label: "En revue" },
  { key: "changes_requested", label: "À corriger" },
  { key: "published", label: "Publiés" },
  { key: "archived", label: "Archivés" },
];

export default function ArticlesAdminView() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const isEditor = user?.role === "admin" || user?.role === "philologist";
  const isAdmin = user?.role === "admin";

  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [filter, setFilter] = useState<"all" | ArticleStatus>("all");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const reload = useCallback(() => {
    fetchArticles().then(setArticles).catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    if (isEditor) reload();
  }, [isEditor, reload]);

  const shown = useMemo(
    () => (filter === "all" ? articles : articles.filter((a) => a.status === filter)),
    [articles, filter],
  );
  const reviewCount = useMemo(() => articles.filter((a) => a.status === "in_review").length, [articles]);

  if (!ready) return null;
  if (!isEditor)
    return (
      <div className="py-20 text-center text-base-content/70">
        <p>Espace de rédaction réservé aux contributeurs.</p>
        <a href="/login" className="link link-primary mt-3 inline-block">Se connecter</a>
      </div>
    );

  return (
    <div className="pb-16 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Articles</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setCreating(true)}>
          Nouvel article
        </button>
      </div>

      {error && <div className="alert alert-warning mt-3 text-sm">{error}</div>}
      {isAdmin && reviewCount > 0 && (
        <p className="mt-3 text-sm text-base-content/70">
          {reviewCount} article{reviewCount > 1 ? "s" : ""} en attente de relecture.
        </p>
      )}

      <div role="tablist" className="tabs tabs-boxed mt-4 w-fit">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`tab ${filter === f.key ? "tab-active" : ""}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
            {f.key === "in_review" && reviewCount > 0 ? ` (${reviewCount})` : ""}
          </button>
        ))}
      </div>

      <ul className="mt-4 divide-y divide-base-300 rounded-box border border-base-300">
        {shown.length === 0 && <li className="px-4 py-6 text-center text-sm text-base-content/60">Aucun article.</li>}
        {shown.map((a) => (
          <li key={a.id}>
            <Link
              href={`/admin/articles/${a.id}`}
              className="flex flex-wrap items-center gap-3 px-4 py-3 transition-colors hover:bg-base-200"
            >
              <span className={`badge badge-sm ${STATUS_BADGE[a.status]}`}>{STATUS_LABEL[a.status]}</span>
              <span className="badge badge-sm badge-outline">{CATEGORY_LABEL[a.category]}</span>
              <span className="min-w-0 flex-1 truncate font-medium">{a.title || "Sans titre"}</span>
              {a.unresolvedComments > 0 && (
                <span className="badge badge-sm badge-warning">{a.unresolvedComments} note{a.unresolvedComments > 1 ? "s" : ""}</span>
              )}
              <time className="shrink-0 text-xs text-base-content/50">{new Date(a.updatedAt).toLocaleDateString("fr-FR")}</time>
            </Link>
          </li>
        ))}
      </ul>

      {creating && (
        <CreateDialog
          isAdmin={!!isAdmin}
          onClose={() => setCreating(false)}
          onCreate={async (title, category, signature) => {
            try {
              const article = await createArticle({ title, category, signature });
              router.push(`/admin/articles/${article.id}`);
            } catch (e) {
              setError((e as Error).message);
              setCreating(false);
            }
          }}
        />
      )}
    </div>
  );
}

function CreateDialog({
  isAdmin,
  onClose,
  onCreate,
}: {
  isAdmin: boolean;
  onClose: () => void;
  onCreate: (title: string, category: ArticleCategory, signature: ArticleSignature) => void;
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ArticleCategory>("philologie");
  const [signature, setSignature] = useState<ArticleSignature>("author");
  const [submitting, setSubmitting] = useState(false);

  const submit = () => {
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    onCreate(title.trim(), category, signature);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-box bg-base-100 p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold">Nouvel article</h2>
        <label className="mt-4 block text-sm font-medium">Titre</label>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          className="input input-bordered mt-1 w-full"
          placeholder="Titre de l'article"
        />
        <label className="mt-4 block text-sm font-medium">Catégorie</label>
        <select
          className="select select-bordered mt-1 w-full"
          value={category}
          onChange={(e) => setCategory(e.target.value as ArticleCategory)}
        >
          <option value="philologie">Philologie</option>
          {isAdmin && <option value="site">Site</option>}
        </select>
        {category === "philologie" && (
          <>
            <label className="mt-4 block text-sm font-medium">Signature</label>
            <select
              className="select select-bordered mt-1 w-full"
              value={signature}
              onChange={(e) => setSignature(e.target.value as ArticleSignature)}
            >
              <option value="author">Mon nom</option>
              <option value="collective">Βιβλίον</option>
            </select>
          </>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary btn-sm" disabled={!title.trim() || submitting} onClick={submit}>
            Créer
          </button>
        </div>
      </div>
    </div>
  );
}
