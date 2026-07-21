import { getToken } from "./api";
import type { BookIntro, BookIntroPatch } from "@/lib/bookIntros";

const base = (corpus: string, book: string) => `/admin/livres/api/${corpus}/${book}`;

async function introFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(url, {
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
      message = (await res.json()).error ?? message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return res.json();
}

export const fetchBookIntro = (corpus: string, book: string) =>
  introFetch<{ intro: BookIntro | null }>(base(corpus, book)).then((d) => d.intro);

export const saveBookIntro = (corpus: string, book: string, patch: BookIntroPatch) =>
  introFetch<{ intro: BookIntro }>(base(corpus, book), { method: "PUT", body: JSON.stringify(patch) }).then((d) => d.intro);

export async function uploadBookIntroImage(corpus: string, book: string, file: Blob): Promise<string> {
  const token = getToken();
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${base(corpus, book)}/upload`, {
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
