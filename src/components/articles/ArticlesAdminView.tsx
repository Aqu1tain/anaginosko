"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/src/hooks/useAuth";
import { can } from "@/src/lib/api";
import { fetchArticles, createArticle } from "@/src/lib/articlesApi";
import type { ArticleSummary, ArticleCategory, ArticleStatus } from "@/lib/articles";
import { STATUS_LABEL, STATUS_DOT, CATEGORY_LABEL } from "./labels";
import { ARTICLE_CATEGORIES, isAdminOnlyCategory } from "@/src/data/articleCategories";

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
  const isEditor = can(user, "articles");
  const isAdmin = can(user, "review");

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
    <div className="mx-auto max-w-4xl pb-16 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Articles</h1>
          <p className="mt-1 text-sm text-base-content/60">Rédaction, relecture et publication.</p>
        </div>
        <button className="btn btn-primary gap-2" onClick={() => setCreating(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Nouvel article
        </button>
      </div>

      {error && <div className="alert alert-warning mt-4 text-sm">{error}</div>}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
              filter === f.key
                ? "border-primary bg-primary text-primary-content"
                : "border-base-300 text-base-content/70 hover:bg-base-200"
            }`}
          >
            {f.label}
            {f.key === "in_review" && reviewCount > 0 ? ` · ${reviewCount}` : ""}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="mt-8 rounded-box border border-dashed border-base-300 py-16 text-center">
          <p className="text-base-content/60">Aucun article ici.</p>
          <button className="btn btn-primary btn-sm mt-4" onClick={() => setCreating(true)}>Créer un article</button>
        </div>
      ) : (
        <ul className="mt-5 space-y-2.5">
          {shown.map((a) => (
            <li key={a.id}>
              <Link
                href={`/admin/articles/${a.id}`}
                className="group flex items-center gap-4 rounded-xl border border-base-300 bg-base-100 px-4 py-3.5 shadow-sm transition-all hover:border-base-content/20 hover:shadow-md"
              >
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_DOT[a.status]}`} title={STATUS_LABEL[a.status]} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold group-hover:text-primary">{a.title || "Sans titre"}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-base-content/50">
                    <span>{CATEGORY_LABEL[a.category]}</span>
                    <span aria-hidden>·</span>
                    <span>{STATUS_LABEL[a.status]}</span>
                    <span aria-hidden>·</span>
                    <time>modifié le {new Date(a.updatedAt).toLocaleDateString("fr-FR")}</time>
                  </p>
                </div>
                {a.unresolvedComments > 0 && (
                  <span className="badge badge-warning badge-sm shrink-0 gap-1">
                    {a.unresolvedComments}
                    <span className="hidden sm:inline">note{a.unresolvedComments > 1 ? "s" : ""}</span>
                  </span>
                )}
                <svg className="shrink-0 text-base-content/30 transition-transform group-hover:translate-x-0.5" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {creating && (
        <CreateDialog
          isAdmin={!!isAdmin}
          onClose={() => setCreating(false)}
          onCreate={async (title, category) => {
            try {
              const article = await createArticle({ title, category });
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
  onCreate: (title: string, category: ArticleCategory) => void;
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ArticleCategory>("philologie");
  const [submitting, setSubmitting] = useState(false);

  const submit = () => {
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    onCreate(title.trim(), category);
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
          {ARTICLE_CATEGORIES.filter((c) => isAdmin || !isAdminOnlyCategory(c.id)).map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <p className="mt-3 text-xs text-base-content/50">
          L&apos;article sera signé du nom d&apos;affichage de votre profil, avec votre photo.
        </p>
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
