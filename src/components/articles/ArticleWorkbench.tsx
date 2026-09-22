"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/hooks/useAuth";
import { can, getToken } from "@/src/lib/api";
import {
  fetchArticle,
  saveArticle,
  transitionArticle,
  addComment,
  resolveThread,
  editComment,
  deleteArticle,
  uploadImage,
} from "@/src/lib/articlesApi";
import { compressImage } from "./compressImage";
import type {
  Article,
  ArticleComment,
  ArticlePatch,
  ArticleEvent,
  TransitionAction,
} from "@/lib/articles";
import { STATUS_LABEL, STATUS_DOT, CATEGORY_LABEL } from "./labels";
import {
  ARTICLE_CATEGORIES,
  isAdminOnlyCategory,
} from "@/src/data/articleCategories";
import ReviewPanel, { type ReviewPassage } from "./ReviewPanel";
import CommentThread from "./CommentThread";
import EditorialWorkflow from "./EditorialWorkflow";

const ArticleEditor = dynamic(() => import("./ArticleEditor"), { ssr: false });

const EVENT_LABEL: Record<ArticleEvent["type"], string> = {
  created: "Création",
  submitted: "Soumis à la relecture",
  changes_requested: "Modifications demandées",
  approved: "Version approuvée",
  published: "Version publiée",
  revised: "Révision ouverte",
  approval_invalidated: "Nouvelle relecture nécessaire",
  unpublished: "Dépublié",
  archived: "Archivé",
  restored: "Restauré en brouillon",
};

type SaveState = "idle" | "saving" | "saved" | "error" | "conflict";

function useIsDark(): boolean {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const read = () =>
      setDark(
        (document.documentElement.getAttribute("data-theme") || "").includes(
          "dark",
        ),
      );
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => obs.disconnect();
  }, []);
  return dark;
}

export default function ArticleWorkbench({ id }: { id: string }) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const dark = useIsDark();
  const [article, setArticle] = useState<Article | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const titleRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const title = titleRef.current;
    if (!title) return;
    const resize = () => {
      title.style.height = "auto";
      title.style.height = `${title.scrollHeight}px`;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [article?.title, ready, user?.id]);

  const revRef = useRef(0);
  const contentRevisionRef = useRef(0);
  const inFlight = useRef<Promise<void> | null>(null);
  const pending = useRef<Partial<ArticlePatch>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Éditabilité relue au moment du flush : BlockNote peut émettre un onChange tardif
  // pendant la bascule en lecture seule ; sans ce garde, la sauvegarde différée
  // partirait après le changement de statut et le serveur la rejetterait (faux conflit).
  const editableRef = useRef(false);

  // Les réponses réseau peuvent arriver dans un ordre différent des écritures.
  // Un commentaire tardif ne doit pas rétablir un ancien contenu ou statut.
  const acceptServerArticle = useCallback((updated: Article) => {
    if (updated.rev < revRef.current) return;
    revRef.current = updated.rev;
    contentRevisionRef.current = updated.contentRevision;
    setArticle((current) => {
      const latest =
        current &&
        (current.rev > updated.rev ||
          (current.rev === updated.rev &&
            current.updatedAt > updated.updatedAt))
          ? current
          : updated;
      return {
        ...latest,
        ...pending.current,
        content: pending.current.content ?? latest.content,
      };
    });
  }, []);

  useEffect(() => {
    if (!ready || !user) return;
    let cancelled = false;
    setError(null);
    fetchArticle(id)
      .then((a) => {
        if (cancelled) return;
        revRef.current = a.rev;
        contentRevisionRef.current = a.contentRevision;
        setArticle(a);
      })
      .catch((e) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [id, ready, user]);

  // Ne pas perdre les dernières frappes : l'autosave est débouncée (1,5 s), donc on
  // pousse ce qui reste en attente à la fermeture de l'onglet (keepalive, best-effort)
  // et au démontage du composant (navigation interne : le fetch survit à l'unmount).
  useEffect(() => {
    const flushPending = () => {
      if (!editableRef.current || inFlight.current) return;
      const patch = pending.current;
      if (Object.keys(patch).length === 0) return;
      pending.current = {};
      if (timer.current) clearTimeout(timer.current);
      const token = getToken();
      fetch(`/admin/articles/api/articles/${id}`, {
        method: "PUT",
        keepalive: true,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ rev: revRef.current, ...patch }),
      }).catch(() => {});
    };
    window.addEventListener("pagehide", flushPending);
    const warnUnsaved = (event: BeforeUnloadEvent) => {
      if (inFlight.current || Object.keys(pending.current).length) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warnUnsaved);
    return () => {
      window.removeEventListener("pagehide", flushPending);
      window.removeEventListener("beforeunload", warnUnsaved);
      flushPending();
    };
  }, [id]);

  const editable =
    !!article &&
    ["draft", "changes_requested", "in_review", "approved"].includes(
      article.status,
    ) &&
    article.author.userId === user?.id &&
    can(user, "articles") &&
    saveState !== "conflict";
  editableRef.current = editable;

  const flush = useCallback(async () => {
    if (inFlight.current) return inFlight.current;
    const task = async () => {
      while (editableRef.current && Object.keys(pending.current).length > 0) {
        const patch = pending.current;
        pending.current = {};
        try {
          const updated = await saveArticle(id, {
            rev: revRef.current,
            ...patch,
          });
          acceptServerArticle(updated);
          setSaveState("saved");
        } catch (e) {
          pending.current = { ...patch, ...pending.current };
          setSaveState(
            (e as { status?: number }).status === 409 ? "conflict" : "error",
          );
          throw e;
        }
      }
      if (Object.keys(pending.current).length)
        throw new Error(
          "Enregistrez ou rechargez vos modifications avant de continuer.",
        );
    };
    const promise = task();
    inFlight.current = promise;
    try {
      await promise;
    } finally {
      if (inFlight.current === promise) inFlight.current = null;
    }
  }, [id, acceptServerArticle]);

  const queueSave = useCallback(
    (patch: Partial<ArticlePatch>) => {
      if (!editableRef.current) return;
      pending.current = { ...pending.current, ...patch };
      setSaveState("saving");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        void flush().catch(() => {});
      }, 1500);
    },
    [flush],
  );

  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const runTransition = async (
    action: TransitionAction | "retry_notification",
    note?: string,
    reviewerId?: number | null,
  ) => {
    if (timer.current) clearTimeout(timer.current);
    await flush();
    const updated = await transitionArticle(
      id,
      action,
      revRef.current,
      note,
      reviewerId,
    );
    acceptServerArticle(updated);
    setActionError(null);
    setSaveState("idle");
  };

  const onCover = async (file: File) => {
    try {
      const url = await uploadImage(id, await compressImage(file));
      setArticle((a) => (a ? { ...a, cover: url } : a));
      queueSave({ cover: url });
    } catch (e) {
      setActionError((e as Error).message);
    }
  };

  const doDelete = async () => {
    try {
      await deleteArticle(id);
      router.push("/admin/articles");
    } catch (e) {
      setActionError((e as Error).message);
      setConfirmDelete(false);
    }
  };

  const handleAddComment = async (text: string, blockId: string | null) => {
    await flush();
    const updated = await addComment(
      id,
      text,
      blockId,
      selectedThread?.threadId,
      selectedThread?.quote,
      contentRevisionRef.current,
    );
    acceptServerArticle(updated);
    const last = updated.comments.at(-1);
    if (last)
      setSelectedThread({
        blockId: last.blockId,
        threadId: last.threadId,
        quote: last.quote,
      });
  };
  const handleResolveThread = async (threadId: string, resolved: boolean) => {
    await flush();
    const updated = await resolveThread(id, threadId, resolved);
    acceptServerArticle(updated);
  };

  // Les pastilles restent ancrées aux passages, mais le fil sélectionné s'affiche
  // dans l'aside (drawer sur mobile) afin de ne jamais recouvrir l'article.
  const editorBoxRef = useRef<HTMLDivElement>(null);
  const [markers, setMarkers] = useState<
    { blockId: string; top: number; count: number; hot: boolean }[]
  >([]);
  const [passages, setPassages] = useState<ReviewPassage[]>([]);
  const [selectedThread, setSelectedThread] = useState<{
    blockId: string | null;
    threadId?: string;
    quote?: string | null;
  } | null>(null);
  const [selectionAnchor, setSelectionAnchor] = useState<{
    blockId: string;
    quote: string;
  } | null>(null);
  const [asideView, setAsideView] = useState("publication");
  const [hoverAdd, setHoverAdd] = useState<{
    blockId: string;
    top: number;
  } | null>(null);
  const comments = article?.comments;

  useEffect(() => {
    const captureSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.rangeCount) return;
      const start = selection.anchorNode?.parentElement?.closest("[data-id]");
      const end = selection.focusNode?.parentElement?.closest("[data-id]");
      if (start && start === end && editorBoxRef.current?.contains(start)) {
        setSelectionAnchor({
          blockId: start.getAttribute("data-id")!,
          quote: selection.toString(),
        });
      } else setSelectionAnchor(null);
    };
    document.addEventListener("selectionchange", captureSelection);
    return () =>
      document.removeEventListener("selectionchange", captureSelection);
  }, []);

  const topOf = (el: Element): number =>
    el.getBoundingClientRect().top -
    (editorBoxRef.current?.getBoundingClientRect().top ?? 0);

  const trackHover = (e: React.MouseEvent) => {
    if (editableRef.current || selectedThread) return;
    const target = e.target as HTMLElement;
    if (target.closest("[data-thread-trigger]")) return;
    const el = target.closest("[data-id]");
    const bid = el?.getAttribute("data-id");
    if (!bid || !el) {
      setHoverAdd(null);
      return;
    }
    if (hoverAdd?.blockId !== bid)
      setHoverAdd({ blockId: bid, top: topOf(el) });
  };

  const findBlock = (blockId: string): Element | null => {
    const blocks = editorBoxRef.current?.querySelectorAll("[data-id]");
    return (
      [...(blocks ?? [])].find(
        (el) => el.getAttribute("data-id") === blockId,
      ) ?? null
    );
  };

  const openThreadFor = (blockId: string | null, threadId?: string) => {
    setAsideView("discussions");
    if (blockId)
      findBlock(blockId)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    const existing = article?.comments.find((c) => c.threadId === threadId);
    setSelectedThread({ blockId, threadId, quote: existing?.quote ?? null });
  };

  useEffect(() => {
    const compute = () => {
      const box = editorBoxRef.current;
      if (!box) {
        setMarkers([]);
        setPassages([]);
        return;
      }
      const blockElements = [...box.querySelectorAll("[data-id]")];
      const seen = new Set<string>();
      setPassages(
        blockElements.flatMap((el) => {
          const blockId = el.getAttribute("data-id");
          const excerpt = el.textContent?.trim().replace(/\s+/g, " ");
          if (!blockId || !excerpt || seen.has(blockId)) return [];
          seen.add(blockId);
          return [{ blockId, excerpt: excerpt.slice(0, 100) }];
        }),
      );
      if (!comments?.length) {
        setMarkers([]);
        return;
      }
      const groups = new Map<string, ArticleComment[]>();
      for (const c of comments)
        if (c.blockId)
          groups.set(c.blockId, [...(groups.get(c.blockId) ?? []), c]);
      const boxTop = box.getBoundingClientRect().top;
      const out: {
        blockId: string;
        top: number;
        count: number;
        hot: boolean;
      }[] = [];
      for (const [blockId, cs] of groups) {
        const el = blockElements.find(
          (candidate) => candidate.getAttribute("data-id") === blockId,
        );
        if (!el) continue;
        const unres = cs.filter((c) => !c.resolved);
        out.push({
          blockId,
          top: el.getBoundingClientRect().top - boxTop,
          count: cs.length,
          hot: unres.length > 0,
        });
      }
      setMarkers(out);
    };
    compute();
    // L'éditeur monte en différé et le texte bouge en cours de frappe : on recale
    // périodiquement (peu coûteux, quelques mesures DOM).
    const late = setTimeout(compute, 700);
    const tick = setInterval(compute, 2000);
    window.addEventListener("resize", compute);
    return () => {
      clearTimeout(late);
      clearInterval(tick);
      window.removeEventListener("resize", compute);
    };
  }, [comments]);

  const excerptFor = (blockId: string): string | null => {
    const t = findBlock(blockId)?.textContent?.trim();
    return t ? t.slice(0, 60) : null;
  };

  if (!ready) return null;
  if (
    !user ||
    !["articles", "review", "publish"].some((p) =>
      can(user, p as "articles" | "review" | "publish"),
    )
  )
    return (
      <div className="py-20 text-center text-base-content/70">
        <p>Édition réservée aux contributeurs.</p>
        <a href={`/login?next=${encodeURIComponent(`/admin/articles/${id}`)}`} className="link link-primary mt-3 inline-block">
          Se connecter
        </a>
      </div>
    );
  if (error)
    return <div className="alert alert-warning mt-6 text-sm">{error}</div>;
  if (!article)
    return (
      <div className="py-20 text-center text-base-content/60">Chargement…</div>
    );

  const isAdmin = can(user, "review");
  const isAuthor = article.author.userId === user.id;
  const canComment = isAdmin || can(user, "publish") || isAuthor;
  const canDelete =
    isAuthor && article.status === "draft" && !article.publishedAt;

  return (
    <div className="mx-auto max-w-5xl pb-16 pt-4">
      <div className="mb-5 flex items-center justify-between gap-3 border-b border-base-300 pb-3">
        <Link
          href="/admin/articles"
          className="flex items-center gap-1.5 text-sm text-base-content/60 hover:text-base-content"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Articles
        </Link>
        <div className="flex items-center gap-3">
          <SaveIndicator state={saveState} />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-base-200 px-3 py-1 text-xs font-medium">
            <span
              className={`h-2 w-2 rounded-full ${STATUS_DOT[article.status]}`}
            />
            {STATUS_LABEL[article.status]}
          </span>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-base-content/60">
            {editable ? (
              <select
                className="select select-xs select-bordered"
                value={article.category}
                onChange={(e) => {
                  const category = e.target.value;
                  setArticle((a) => (a ? { ...a, category } : a));
                  queueSave({ category });
                }}
              >
                {ARTICLE_CATEGORIES.filter(
                  (c) => isAdmin || !isAdminOnlyCategory(c.id),
                ).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            ) : (
              <span className="rounded-full border border-base-300 px-2.5 py-0.5">
                {CATEGORY_LABEL[article.category] ?? article.category}
              </span>
            )}
            <span>
              {article.author.userId === user.id ? (
                <>
                  Signé du nom d&apos;affichage de votre{" "}
                  <Link href="/mon-profil" className="link">
                    profil
                  </Link>
                </>
              ) : (
                <>Auteur : {article.author.name}</>
              )}
            </span>
          </div>

          <textarea
            ref={titleRef}
            rows={1}
            aria-label="Titre de l’article"
            value={article.title}
            disabled={!editable}
            onChange={(e) => {
              const title = e.target.value;
              setArticle((a) => (a ? { ...a, title } : a));
              queueSave({ title });
            }}
            placeholder="Titre de l'article"
            className="w-full resize-none overflow-hidden bg-transparent text-2xl font-bold leading-tight focus:outline-none disabled:text-base-content sm:text-3xl lg:text-4xl"
          />
          <textarea
            aria-label="Résumé de l’article"
            value={article.excerpt}
            disabled={!editable}
            onChange={(e) => {
              const excerpt = e.target.value;
              setArticle((a) => (a ? { ...a, excerpt } : a));
              queueSave({ excerpt });
            }}
            placeholder="Résumé (affiché dans la liste et le référencement)"
            rows={2}
            className="mt-2 w-full resize-none bg-transparent text-base text-base-content/70 focus:outline-none"
          />

          {(article.cover || editable) && (
            <div className="mt-3">
              {article.cover ? (
                <div className="relative overflow-hidden rounded-xl border border-base-300">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={article.cover}
                    alt="Couverture"
                    className="max-h-64 w-full object-cover"
                  />
                  {editable && (
                    <button
                      type="button"
                      className="btn btn-xs absolute right-2 top-2"
                      onClick={() => {
                        setArticle((a) => (a ? { ...a, cover: null } : a));
                        queueSave({ cover: null });
                      }}
                    >
                      Retirer la couverture
                    </button>
                  )}
                </div>
              ) : (
                <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-base-content/50 transition-colors hover:text-base-content">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="9" cy="9" r="2" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                  Ajouter une couverture
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={(e) => {
                      if (e.target.files?.[0]) onCover(e.target.files[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
          )}

          {saveState === "conflict" && (
            <div className="alert alert-error my-3 text-sm">
              Version périmée (édité ailleurs). Rechargez la page pour
              continuer.
            </div>
          )}

          {canComment && selectionAnchor && (
            <button
              className="btn btn-sm btn-outline my-2"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setSelectedThread(selectionAnchor);
                setAsideView("discussions");
                setSelectionAnchor(null);
                window.getSelection()?.removeAllRanges();
              }}
            >
              Commenter la sélection
            </button>
          )}
          {/* Zone d'écriture intégrée à la page (pas de cadre), comme Notion. */}
          <div
            ref={editorBoxRef}
            className="article-editor relative mt-2"
            onMouseMove={trackHover}
            onMouseLeave={() => setHoverAdd(null)}
          >
            <ArticleEditor
              articleId={article.id}
              initialContent={article.content}
              editable={editable}
              dark={dark}
              onChange={(content) => {
                if (editable) queueSave({ content });
              }}
            />

            {markers.map((m) => (
              <button
                key={m.blockId}
                type="button"
                data-thread-trigger
                title="Ouvrir le fil de commentaires"
                onClick={(e) => {
                  e.stopPropagation();
                  openThreadFor(
                    m.blockId,
                    article.comments.find(
                      (c) => c.blockId === m.blockId && !c.resolved,
                    )?.threadId ??
                      article.comments.find((c) => c.blockId === m.blockId)
                        ?.threadId,
                  );
                }}
                aria-label={`${m.count} commentaire${m.count > 1 ? "s" : ""} sur ce passage`}
                className={`absolute hidden h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold shadow-sm transition-transform hover:scale-110 lg:flex ${
                  m.hot
                    ? "bg-warning text-warning-content"
                    : "bg-base-200 text-base-content/60"
                }`}
                style={{ top: m.top, right: -34 }}
              >
                {m.count}
              </button>
            ))}

            {hoverAdd &&
              !markers.some((m) => m.blockId === hoverAdd.blockId) && (
                // Conteneur qui CHEVAUCHE le bord de l'éditeur : aucun espace mort entre
                // le texte et la bulle, sinon elle se démonte avant d'être atteinte.
                <div
                  data-thread-trigger
                  className="absolute z-20 hidden items-center justify-end lg:flex"
                  style={{
                    top: hoverAdd.top - 3,
                    right: -46,
                    width: 64,
                    height: 30,
                  }}
                >
                  <button
                    type="button"
                    title="Commenter cette ligne"
                    onClick={(e) => {
                      e.stopPropagation();
                      openThreadFor(hoverAdd.blockId);
                      setHoverAdd(null);
                    }}
                    aria-label="Commenter ce passage"
                    className="flex h-6 w-6 items-center justify-center rounded-full border border-base-300 bg-base-100 text-sm text-base-content/50 shadow-sm transition-all hover:scale-110 hover:text-primary"
                  >
                    +
                  </button>
                </div>
              )}
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <nav
            className="flex flex-wrap gap-1 rounded-xl border border-base-300 bg-base-100 p-1"
            aria-label="Outils de l’article"
          >
            {[
              ["publication", "Publication"],
              [
                "discussions",
                `Discussions (${new Set(article.comments.filter((c) => !c.resolved).map((c) => c.threadId)).size})`,
              ],
              ["historique", "Historique"],
            ].map(([key, label]) => (
              <button
                key={key}
                className={`btn btn-xs flex-1 ${asideView === key ? "btn-primary" : "btn-ghost"}`}
                aria-pressed={asideView === key}
                onClick={() => {
                  setAsideView(key);
                  if (key !== "discussions") setSelectedThread(null);
                }}
              >
                {label}
              </button>
            ))}
          </nav>
          {asideView === "publication" && (
            <EditorialWorkflow
              article={article}
              user={user}
              onAction={runTransition}
            />
          )}
          {asideView === "publication" && canDelete && (
            <button
              className="btn btn-ghost btn-sm text-error"
              onClick={() => setConfirmDelete(true)}
            >
              Supprimer ce brouillon inédit
            </button>
          )}
          {actionError && (
            <p role="alert" className="text-sm text-error">
              {actionError}
            </p>
          )}

          {asideView === "discussions" &&
            (selectedThread ? (
              <div
                className="fixed inset-0 z-[70] flex items-end bg-black/45 p-3 lg:static lg:block lg:bg-transparent lg:p-0"
                onClick={() => setSelectedThread(null)}
              >
                <div
                  className="max-h-[88dvh] w-full overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <CommentThread
                    key={
                      selectedThread.threadId ?? `new-${selectedThread.blockId}`
                    }
                    excerpt={
                      selectedThread.quote ??
                      (selectedThread.blockId
                        ? excerptFor(selectedThread.blockId)
                        : null)
                    }
                    orphaned={
                      !!selectedThread.blockId &&
                      !excerptFor(selectedThread.blockId)
                    }
                    userId={user.id}
                    onEdit={async (commentId, text) => {
                      await flush();
                      const updated = await editComment(id, commentId, text);
                      acceptServerArticle(updated);
                    }}
                    comments={article.comments.filter(
                      (comment) =>
                        !!selectedThread.threadId &&
                        comment.threadId === selectedThread.threadId,
                    )}
                    canComment={canComment}
                    onAdd={(text) =>
                      handleAddComment(text, selectedThread.blockId)
                    }
                    onResolveThread={(resolved) =>
                      selectedThread.threadId
                        ? handleResolveThread(selectedThread.threadId, resolved)
                        : Promise.resolve()
                    }
                    onClose={() => setSelectedThread(null)}
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
                <ReviewPanel
                  comments={article.comments}
                  canComment={canComment}
                  passages={passages}
                  excerptFor={excerptFor}
                  onOpenThread={openThreadFor}
                />
              </div>
            ))}

          {asideView === "historique" && article.events.length > 0 && (
            <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-base-content/60">
                Historique
              </h2>
              <ul className="mt-2 space-y-2 text-xs">
                {[...article.events].reverse().map((e, i) => (
                  <li key={i}>
                    <span className="font-medium">
                      {EVENT_LABEL[e.type] ?? e.type}
                    </span>
                    <span className="text-base-content/50">
                      {" "}
                      · {e.by || "?"} ·{" "}
                      {new Date(e.at).toLocaleDateString("fr-FR")}
                    </span>
                    {e.note && (
                      <p className="mt-0.5 whitespace-pre-wrap rounded bg-base-200/60 px-2 py-1 text-base-content/80">
                        {e.note}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>

      {confirmDelete && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setConfirmDelete(false)}
        >
          <div
            className="w-full max-w-xs rounded-box bg-base-100 p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-medium">Supprimer cet article ?</p>
            <p className="mt-1 text-xs text-base-content/60">
              « {article.title} » et ses images seront supprimés définitivement.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setConfirmDelete(false)}
              >
                Annuler
              </button>
              <button className="btn btn-error btn-sm" onClick={doDelete}>
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
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
  const tone =
    state === "error" || state === "conflict"
      ? "text-error"
      : "text-base-content/50";
  return <span className={tone}>{map[state]}</span>;
}
