"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useAuth } from "@/src/hooks/useAuth";
import { fetchArticle, saveArticle } from "@/src/lib/articlesApi";
import type { Article, ArticlePatch, ArticleSignature } from "@/lib/articles";
import { STATUS_LABEL, STATUS_BADGE, CATEGORY_LABEL } from "./labels";

const ArticleEditor = dynamic(() => import("./ArticleEditor"), { ssr: false });

type SaveState = "idle" | "saving" | "saved" | "error" | "conflict";

function useIsDark(): boolean {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const read = () => setDark((document.documentElement.getAttribute("data-theme") || "").includes("dark"));
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

export default function ArticleWorkbench({ id }: { id: string }) {
  const { user, ready } = useAuth();
  const dark = useIsDark();
  const [article, setArticle] = useState<Article | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const revRef = useRef(0);
  const pending = useRef<Partial<ArticlePatch>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchArticle(id)
      .then((a) => {
        revRef.current = a.rev;
        setArticle(a);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  const editable =
    !!article &&
    (article.status === "draft" || article.status === "changes_requested") &&
    (user?.role === "admin" || article.author.userId === user?.id) &&
    saveState !== "conflict";

  const flush = useCallback(async () => {
    const patch = pending.current;
    pending.current = {};
    if (Object.keys(patch).length === 0) return;
    try {
      const updated = await saveArticle(id, { rev: revRef.current, ...patch });
      revRef.current = updated.rev;
      setArticle((a) => (a ? { ...a, slug: updated.slug, updatedAt: updated.updatedAt } : updated));
      setSaveState("saved");
    } catch (e) {
      setSaveState((e as { status?: number }).status === 409 ? "conflict" : "error");
    }
  }, [id]);

  const queueSave = useCallback(
    (patch: Partial<ArticlePatch>) => {
      pending.current = { ...pending.current, ...patch };
      setSaveState("saving");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, 1500);
    },
    [flush],
  );

  if (!ready) return null;
  if (!user || (user.role !== "admin" && user.role !== "philologist"))
    return (
      <div className="py-20 text-center text-base-content/70">
        <p>Édition réservée aux contributeurs.</p>
        <a href="/login" className="link link-primary mt-3 inline-block">Se connecter</a>
      </div>
    );
  if (error) return <div className="alert alert-warning mt-6 text-sm">{error}</div>;
  if (!article) return <div className="py-20 text-center text-base-content/60">Chargement…</div>;

  return (
    <div className="pb-16 pt-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link href="/admin/articles" className="link text-sm text-base-content/70">← Articles</Link>
        <div className="flex items-center gap-3 text-sm">
          <SaveIndicator state={saveState} />
          <span className={`badge ${STATUS_BADGE[article.status]}`}>{STATUS_LABEL[article.status]}</span>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-base-content/60">
        <span className="badge badge-outline">{CATEGORY_LABEL[article.category]}</span>
        {article.category === "philologie" && (
          <label className="flex items-center gap-1">
            Signature
            <select
              className="select select-xs select-bordered"
              value={article.signature}
              disabled={!editable}
              onChange={(e) => {
                const signature = e.target.value as ArticleSignature;
                setArticle((a) => (a ? { ...a, signature } : a));
                queueSave({ signature });
              }}
            >
              <option value="author">Mon nom ({article.author.name})</option>
              <option value="collective">Βιβλίον</option>
            </select>
          </label>
        )}
      </div>

      <input
        type="text"
        value={article.title}
        disabled={!editable}
        onChange={(e) => {
          const title = e.target.value;
          setArticle((a) => (a ? { ...a, title } : a));
          queueSave({ title });
        }}
        placeholder="Titre de l'article"
        className="input input-ghost w-full px-0 text-3xl font-bold focus:outline-none"
      />
      <textarea
        value={article.excerpt}
        disabled={!editable}
        onChange={(e) => {
          const excerpt = e.target.value;
          setArticle((a) => (a ? { ...a, excerpt } : a));
          queueSave({ excerpt });
        }}
        placeholder="Résumé (liste et référencement)"
        rows={2}
        className="textarea textarea-ghost mt-1 w-full resize-none px-0 text-base text-base-content/80 focus:outline-none"
      />

      {saveState === "conflict" && (
        <div className="alert alert-error my-3 text-sm">
          Version périmée (édité ailleurs). Rechargez la page pour continuer.
        </div>
      )}

      <div className="mt-4 rounded-box border border-base-300 bg-base-100">
        <ArticleEditor
          articleId={article.id}
          initialContent={article.content}
          editable={editable}
          dark={dark}
          onChange={(content) => queueSave({ content })}
        />
      </div>
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  const map: Record<SaveState, string> = {
    idle: "",
    saving: "Enregistrement…",
    saved: "Enregistré",
    error: "Échec de l'enregistrement",
    conflict: "Conflit de version",
  };
  if (!map[state]) return null;
  const tone = state === "error" || state === "conflict" ? "text-error" : "text-base-content/50";
  return <span className={tone}>{map[state]}</span>;
}
