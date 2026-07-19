"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/hooks/useAuth";
import { getToken } from "@/src/lib/api";
import {
  fetchArticle,
  saveArticle,
  transitionArticle,
  addComment,
  resolveComment,
  deleteArticle,
  uploadImage,
} from "@/src/lib/articlesApi";
import { compressImage } from "./compressImage";
import type { Article, ArticleComment, ArticlePatch, ArticleStatus, ArticleEvent, TransitionAction } from "@/lib/articles";
import { STATUS_LABEL, STATUS_DOT, CATEGORY_LABEL } from "./labels";
import ReviewPanel from "./ReviewPanel";

type ActionDef = { action: TransitionAction; label: string; style: string };

function availableActions(status: ArticleStatus, isAdmin: boolean, isAuthor: boolean): ActionDef[] {
  const author = isAdmin || isAuthor;
  switch (status) {
    case "draft":
      return author ? [{ action: "submit", label: "Soumettre à la relecture", style: "btn-primary" }] : [];
    case "changes_requested":
      return author ? [{ action: "submit", label: "Renvoyer en relecture", style: "btn-primary" }] : [];
    case "in_review":
      return isAdmin
        ? [
            { action: "approve", label: "Approuver et publier", style: "btn-primary" },
            { action: "request_changes", label: "Demander des modifications", style: "btn-outline" },
          ]
        : [];
    case "published":
      return isAdmin
        ? [
            { action: "unpublish", label: "Dépublier", style: "btn-outline" },
            { action: "archive", label: "Archiver", style: "btn-outline" },
          ]
        : [];
    case "archived":
      return isAdmin ? [{ action: "restore", label: "Restaurer en brouillon", style: "btn-outline" }] : [];
    default:
      return [];
  }
}

const ArticleEditor = dynamic(() => import("./ArticleEditor"), { ssr: false });

const EVENT_LABEL: Record<ArticleEvent["type"], string> = {
  created: "Création",
  submitted: "Soumis à la relecture",
  changes_requested: "Modifications demandées",
  approved: "Approuvé et publié",
  unpublished: "Dépublié",
  archived: "Archivé",
  restored: "Restauré en brouillon",
};

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
  const router = useRouter();
  const dark = useIsDark();
  const [article, setArticle] = useState<Article | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const revRef = useRef(0);
  const pending = useRef<Partial<ArticlePatch>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Éditabilité relue au moment du flush : BlockNote peut émettre un onChange tardif
  // pendant la bascule en lecture seule ; sans ce garde, la sauvegarde différée
  // partirait après le changement de statut et le serveur la rejetterait (faux conflit).
  const editableRef = useRef(false);

  useEffect(() => {
    fetchArticle(id)
      .then((a) => {
        revRef.current = a.rev;
        setArticle(a);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  // Ne pas perdre les dernières frappes : l'autosave est débouncée (1,5 s), donc on
  // pousse ce qui reste en attente à la fermeture de l'onglet (keepalive, best-effort)
  // et au démontage du composant (navigation interne : le fetch survit à l'unmount).
  useEffect(() => {
    const flushPending = () => {
      if (!editableRef.current) return;
      const patch = pending.current;
      if (Object.keys(patch).length === 0) return;
      pending.current = {};
      if (timer.current) clearTimeout(timer.current);
      const token = getToken();
      fetch(`/admin/articles/api/articles/${id}`, {
        method: "PUT",
        keepalive: true,
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ rev: revRef.current, ...patch }),
      }).catch(() => {});
    };
    window.addEventListener("pagehide", flushPending);
    return () => {
      window.removeEventListener("pagehide", flushPending);
      flushPending();
    };
  }, [id]);

  const editable =
    !!article &&
    (article.status === "draft" || article.status === "changes_requested") &&
    article.author.userId === user?.id &&
    saveState !== "conflict";
  editableRef.current = editable;

  const flush = useCallback(async () => {
    const patch = pending.current;
    pending.current = {};
    if (!editableRef.current || Object.keys(patch).length === 0) return;
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
      if (!editableRef.current) return;
      pending.current = { ...pending.current, ...patch };
      setSaveState("saving");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, 1500);
    },
    [flush],
  );

  const [selected, setSelected] = useState<{ id: string; excerpt: string } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const runTransition = async (action: TransitionAction, note?: string) => {
    if (timer.current) {
      clearTimeout(timer.current);
      await flush();
    }
    try {
      const updated = await transitionArticle(id, action, note);
      revRef.current = updated.rev;
      setArticle(updated);
      setActionError(null);
      setSaveState("idle");
    } catch (e) {
      setActionError((e as Error).message);
    }
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
    setArticle(await addComment(id, text, blockId));
  };
  const handleResolve = async (commentId: string, resolved: boolean) => {
    setArticle(await resolveComment(id, commentId, resolved));
  };

  const captureBlock = (e: React.MouseEvent) => {
    const el = (e.target as HTMLElement).closest("[data-id]");
    const bid = el?.getAttribute("data-id");
    if (bid) setSelected({ id: bid, excerpt: (el?.textContent || "").trim().slice(0, 70) });
  };
  const jumpTo = (blockId: string) => {
    const el = document.querySelector(`[data-id="${blockId}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-2", "ring-primary", "rounded");
    setTimeout(() => el.classList.remove("ring-2", "ring-primary", "rounded"), 1600);
  };

  // Pastilles de marge : signalent, au niveau de chaque ligne commentée, le nombre
  // de commentaires (ambre = non résolus). Clic : le fil correspondant est amené à
  // l'écran et surligné dans le panneau de revue.
  const editorBoxRef = useRef<HTMLDivElement>(null);
  const [markers, setMarkers] = useState<{ blockId: string; top: number; count: number; hot: boolean; firstId: string }[]>([]);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const comments = article?.comments;

  useEffect(() => {
    const compute = () => {
      const box = editorBoxRef.current;
      if (!box || !comments?.length) {
        setMarkers([]);
        return;
      }
      const groups = new Map<string, ArticleComment[]>();
      for (const c of comments) if (c.blockId) groups.set(c.blockId, [...(groups.get(c.blockId) ?? []), c]);
      const boxTop = box.getBoundingClientRect().top;
      const out: { blockId: string; top: number; count: number; hot: boolean; firstId: string }[] = [];
      for (const [blockId, cs] of groups) {
        const el = box.querySelector(`[data-id="${blockId}"]`);
        if (!el) continue;
        const unres = cs.filter((c) => !c.resolved);
        out.push({
          blockId,
          top: el.getBoundingClientRect().top - boxTop,
          count: cs.length,
          hot: unres.length > 0,
          firstId: (unres[0] ?? cs[0]).id,
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
    const t = editorBoxRef.current?.querySelector(`[data-id="${blockId}"]`)?.textContent?.trim();
    return t ? t.slice(0, 60) : null;
  };

  const focusThread = (firstId: string) => {
    setHighlightId(firstId);
    setTimeout(() => setHighlightId(null), 2200);
  };

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

  const isAdmin = user.role === "admin";
  const isAuthor = article.author.userId === user.id;
  const canComment = isAdmin || isAuthor;
  const canDelete = isAdmin || (isAuthor && article.status === "draft");
  const actions = availableActions(article.status, isAdmin, isAuthor);

  return (
    <div className="mx-auto max-w-5xl pb-16 pt-4">
      <div className="mb-5 flex items-center justify-between gap-3 border-b border-base-300 pb-3">
        <Link href="/admin/articles" className="flex items-center gap-1.5 text-sm text-base-content/60 hover:text-base-content">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Articles
        </Link>
        <div className="flex items-center gap-3">
          <SaveIndicator state={saveState} />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-base-200 px-3 py-1 text-xs font-medium">
            <span className={`h-2 w-2 rounded-full ${STATUS_DOT[article.status]}`} />
            {STATUS_LABEL[article.status]}
          </span>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-base-content/60">
            <span className="rounded-full border border-base-300 px-2.5 py-0.5">{CATEGORY_LABEL[article.category]}</span>
            <span>
              Signé du nom d&apos;affichage de votre <Link href="/mon-profil" className="link">profil</Link>
            </span>
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
            className="w-full bg-transparent text-2xl font-bold leading-tight focus:outline-none disabled:text-base-content sm:text-3xl lg:text-4xl"
          />
          <textarea
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
                  <img src={article.cover} alt="Couverture" className="max-h-64 w-full object-cover" />
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
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
              Version périmée (édité ailleurs). Rechargez la page pour continuer.
            </div>
          )}

          {/* Zone d'écriture intégrée à la page (pas de cadre), comme Notion. */}
          {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events */}
          <div ref={editorBoxRef} className="article-editor relative mt-2" onClick={captureBlock}>
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
                title="Voir le commentaire"
                onClick={(e) => {
                  e.stopPropagation();
                  focusThread(m.firstId);
                }}
                className={`absolute hidden h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold shadow-sm transition-transform hover:scale-110 lg:flex ${
                  m.hot ? "bg-warning text-warning-content" : "bg-base-200 text-base-content/60"
                }`}
                style={{ top: m.top, right: -34 }}
              >
                {m.count}
              </button>
            ))}
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          {(actions.length > 0 || article.status === "published" || canDelete) && (
            <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
              <div className="flex flex-col gap-2">
                {actions.map((a) => (
                  <button
                    key={a.action}
                    className={`btn btn-sm ${a.style}`}
                    onClick={() => (a.action === "request_changes" ? setNoteOpen(true) : runTransition(a.action))}
                  >
                    {a.label}
                  </button>
                ))}
                {article.status === "published" && (
                  <a href={`/articles/${article.slug}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
                    Voir l&apos;article publié
                  </a>
                )}
                {canDelete && (
                  <button className="btn btn-ghost btn-sm text-error" onClick={() => setConfirmDelete(true)}>
                    Supprimer l&apos;article
                  </button>
                )}
              </div>
              {actionError && <p className="mt-2 text-sm text-error">{actionError}</p>}
            </div>
          )}

          <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
            <ReviewPanel
              comments={article.comments}
              canComment={canComment}
              selected={selected}
              highlightId={highlightId}
              excerptFor={excerptFor}
              onClearSelected={() => setSelected(null)}
              onAdd={handleAddComment}
              onResolve={handleResolve}
              onJumpTo={jumpTo}
            />
          </div>

          {article.events.length > 0 && (
            <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-base-content/60">Historique</h2>
              <ul className="mt-2 space-y-2 text-xs">
                {[...article.events].reverse().map((e, i) => (
                  <li key={i}>
                    <span className="font-medium">{EVENT_LABEL[e.type] ?? e.type}</span>
                    <span className="text-base-content/50">
                      {" "}· {e.by || "?"} · {new Date(e.at).toLocaleDateString("fr-FR")}
                    </span>
                    {e.note && <p className="mt-0.5 whitespace-pre-wrap rounded bg-base-200/60 px-2 py-1 text-base-content/80">{e.note}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>

      {noteOpen && (
        <NoteDialog
          onClose={() => setNoteOpen(false)}
          onSend={(note) => {
            setNoteOpen(false);
            runTransition("request_changes", note);
          }}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" onClick={() => setConfirmDelete(false)}>
          <div className="w-full max-w-xs rounded-box bg-base-100 p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-medium">Supprimer cet article ?</p>
            <p className="mt-1 text-xs text-base-content/60">« {article.title} » et ses images seront supprimés définitivement.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(false)}>Annuler</button>
              <button className="btn btn-error btn-sm" onClick={doDelete}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NoteDialog({ onClose, onSend }: { onClose: () => void; onSend: (note?: string) => void }) {
  const [note, setNote] = useState("");
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-box bg-base-100 p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold">Demander des modifications</h2>
        <p className="mt-1 text-sm text-base-content/60">
          Expliquez à l&apos;auteur ce qui doit changer. La note apparaîtra dans l&apos;historique de l&apos;article.
        </p>
        <textarea
          autoFocus
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          placeholder="Ce qui doit être revu…"
          className="textarea textarea-bordered mt-3 w-full text-sm"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary btn-sm" onClick={() => onSend(note.trim() || undefined)}>
            Renvoyer à l&apos;auteur
          </button>
        </div>
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
