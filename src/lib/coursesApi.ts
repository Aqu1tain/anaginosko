import { getToken } from "./api";
import type { ArticleSummary } from "@/lib/articles";
import type { Course, CoursePatch } from "@/lib/courses";

// Client de l'administration des cours (route handlers Next).
const BASE = "/admin/cours/api/courses";

async function courseFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? `Erreur ${res.status}`);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

export const fetchCourses = () => courseFetch<{ courses: Course[]; articles: ArticleSummary[] }>("");
export const fetchCourse = (id: string) => courseFetch<{ course: Course }>(`/${id}`).then((d) => d.course);
export const createCourse = (title: string) =>
  courseFetch<{ course: Course }>("", { method: "POST", body: JSON.stringify({ title }) }).then((d) => d.course);
export const saveCourse = (id: string, patch: CoursePatch) =>
  courseFetch<{ course: Course }>(`/${id}`, { method: "PUT", body: JSON.stringify(patch) }).then((d) => d.course);
export const deleteCourse = (id: string) => courseFetch<void>(`/${id}`, { method: "DELETE" });

// Cours rédigés dans le dépôt (content/cours), à importer en brouillon.
export type CourseBundle = { slug: string; title: string; lessons: number; imported: boolean };
const importFetch = async <T,>(options: RequestInit = {}): Promise<T> => {
  const token = getToken();
  const res = await fetch("/admin/cours/api/import", {
    ...options,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? `Erreur ${res.status}`);
  return data as T;
};
export const fetchBundles = () => importFetch<{ bundles: CourseBundle[] }>().then((d) => d.bundles);
export const importBundle = (slug: string) =>
  importFetch<{ course: Course }>({ method: "POST", body: JSON.stringify({ slug }) }).then((d) => d.course);
