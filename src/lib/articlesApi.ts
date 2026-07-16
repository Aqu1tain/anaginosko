import { getToken } from "./api";
import type {
  Article,
  ArticleSummary,
  ArticleCategory,
  ArticleSignature,
  ArticlePatch,
  TransitionAction,
} from "@/lib/articles";

// Client des articles : vise les route handlers Next (pas l'API Adonis /api). Même
// jeton que le reste (localStorage anaginosko:token), base relative same-origin.
const BASE = "/admin/articles/api";

async function articleFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    let message = `Erreur ${res.status}`;
    try {
      const data = await res.json();
      message = data.error ?? message;
    } catch {
      /* ignore */
    }
    const err = new Error(message) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const fetchArticles = () =>
  articleFetch<{ articles: ArticleSummary[] }>("/articles").then((d) => d.articles);

export const fetchArticle = (id: string) =>
  articleFetch<{ article: Article }>(`/articles/${id}`).then((d) => d.article);

export const createArticle = (input: { title: string; category: ArticleCategory; signature?: ArticleSignature }) =>
  articleFetch<{ article: Article }>("/articles", { method: "POST", body: JSON.stringify(input) }).then((d) => d.article);

export const saveArticle = (id: string, patch: ArticlePatch) =>
  articleFetch<{ article: Article }>(`/articles/${id}`, { method: "PUT", body: JSON.stringify(patch) }).then((d) => d.article);

export const deleteArticle = (id: string) =>
  articleFetch<{ ok: boolean }>(`/articles/${id}`, { method: "DELETE" });

export const transitionArticle = (id: string, action: TransitionAction, note?: string) =>
  articleFetch<{ article: Article }>(`/articles/${id}/status`, {
    method: "POST",
    body: JSON.stringify({ action, note }),
  }).then((d) => d.article);

export const addComment = (id: string, text: string, blockId?: string | null) =>
  articleFetch<{ article: Article }>(`/articles/${id}/comments`, {
    method: "POST",
    body: JSON.stringify({ text, blockId: blockId ?? null }),
  }).then((d) => d.article);

export const resolveComment = (id: string, commentId: string, resolved: boolean) =>
  articleFetch<{ article: Article }>(`/articles/${id}/comments`, {
    method: "PATCH",
    body: JSON.stringify({ commentId, resolved }),
  }).then((d) => d.article);

export async function uploadImage(id: string, file: Blob): Promise<string> {
  const token = getToken();
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/articles/${id}/upload`, {
    method: "POST",
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: form,
  });
  if (!res.ok) {
    let message = `Erreur ${res.status}`;
    try {
      message = (await res.json()).error ?? message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return (await res.json()).url as string;
}
