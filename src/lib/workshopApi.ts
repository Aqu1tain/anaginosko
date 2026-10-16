import { apiFetch, getToken } from "./api";

// Client de l'atelier de traduction : l'API Adonis (/api/workshop), sauf la
// validation, qui passe par le site pour régénérer les pages du lecteur.

export type WorkCorpus = "nt" | "lxx";
export type DraftStatus = "draft" | "review" | "changes";
export type Published = { text: string; by: string; at: string };
export type Draft = { ref: string; text: string | null; status: DraftStatus; authorId: number | null; author: string; note: string | null; updatedAt: string };
export type Comment = { id: number; author: string; body: string; resolved: boolean; at: string };
export type ChapterWork = { published: Record<string, Published>; drafts: Record<string, Draft>; comments: Record<string, Comment[]> };
export type KeyTerm = { lemma: string; renderings: string[]; note: string | null; by: string };
export type QueueItem = { book: string; ref: string; author: string; note: string | null };
export type WorkshopStats = {
  books: Record<string, { published: number; draft: number; review: number; changes: number }>;
  translators: { name: string; published: number }[];
  weekly: { week: string; revisions: number }[];
  queue: { toReview: QueueItem[]; changes: QueueItem[]; drafts: QueueItem[]; waiting: number };
};
export type VerseCounts = Record<string, { total: number; chapters: Record<number, number> }>;

const json = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });

export const fetchChapterWork = (corpus: WorkCorpus, book: string, chapter: number) =>
  apiFetch<ChapterWork>(`/workshop/chapter?${new URLSearchParams({ corpus, book, chapter: String(chapter) })}`);

export const saveDrafts = (corpus: WorkCorpus, book: string, changes: { ref: string; text: string | null }[]) =>
  apiFetch<{ saved: number }>("/workshop/drafts", { method: "PUT", body: JSON.stringify({ corpus, book, changes }) });

export const discardDrafts = (corpus: WorkCorpus, book: string, refs: string[]) => apiFetch("/workshop/discard", json({ corpus, book, refs }));
export const submitDrafts = (corpus: WorkCorpus, book: string, refs: string[]) => apiFetch<{ submitted: number }>("/workshop/submit", json({ corpus, book, refs }));

export async function reviewDrafts(corpus: WorkCorpus, book: string, refs: string[], action: "approve" | "changes", note?: string) {
  const token = getToken();
  const res = await fetch("/admin/arbitrage/api/workshop/review", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ corpus, book, refs, action, note }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? `Erreur ${res.status}`);
  return data as { done: number; skipped: number };
}

export const addComment = (corpus: WorkCorpus, book: string, ref: string, body: string) =>
  apiFetch<{ comment: Comment }>("/workshop/comments", json({ corpus, book, ref, body })).then((d) => d.comment);
export const resolveComment = (id: number, resolved: boolean) =>
  apiFetch(`/workshop/comments/${id}`, { method: "PATCH", body: JSON.stringify({ resolved }) });

export const fetchTerms = () => apiFetch<{ terms: KeyTerm[] }>("/workshop/terms").then((d) => d.terms);
export const saveTerm = (lemma: string, renderings: string[], note?: string) =>
  apiFetch("/workshop/terms", { method: "PUT", body: JSON.stringify({ lemma, renderings, note }) });

export const fetchWorkshopStats = (corpus: WorkCorpus) => apiFetch<WorkshopStats>(`/workshop/stats?corpus=${corpus}`);
export const fetchHistory = (corpus: WorkCorpus, book: string, ref: string) =>
  apiFetch<{ revisions: { text: string | null; by: string; at: string }[] }>(`/translations/history?${new URLSearchParams({ corpus, book, ref })}`).then((d) => d.revisions);

export async function fetchVerseCounts(corpus: WorkCorpus): Promise<VerseCounts> {
  const token = getToken();
  const res = await fetch(`/admin/arbitrage/api/workshop/verses?corpus=${corpus}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new Error(`Erreur ${res.status}`);
  return (await res.json()).verses;
}
