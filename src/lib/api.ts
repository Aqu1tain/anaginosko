// Client de l'API Anaginosko (backend AdonisJS). Base configurable :
// VITE_API_BASE (ex. /api en prod via nginx ; http://localhost:3333/api en dev).
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "/api";
const TOKEN_KEY = "anaginosko:token";

export type Role = "admin" | "philologist";
export type AuthUser = { id: number; displayName: string; role: Role };

export type Annotation = {
  id: number;
  ref: string;
  verse: number | null;
  wordIndex: number | null;
  endWordIndex: number | null;
  graphemeIndex: number | null;
  body: string;
  source: string;
  link: string | null;
  userId: number | null;
  author: { displayName: string; role: Role } | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export const getToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

const setToken = (t: string | null) => {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
};

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
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
      message = data.error ?? data.errors?.[0]?.message ?? message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const data = await apiFetch<{ token: string; user: AuthUser }>("/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setToken(data.token);
  return data.user;
}

export async function logout(): Promise<void> {
  try {
    await apiFetch("/logout", { method: "POST" });
  } catch {
    /* ignore */
  }
  setToken(null);
}

export const fetchMe = () => apiFetch<{ user: AuthUser }>("/me").then((d) => d.user);

export const fetchAnnotations = (ref: string) =>
  apiFetch<Annotation[]>(`/annotations?ref=${encodeURIComponent(ref)}`);

export type AnnotationInput = {
  ref: string;
  verse?: number | null;
  wordIndex?: number | null;
  endWordIndex?: number | null;
  graphemeIndex?: number | null;
  body: string;
  source: string;
  link?: string | null;
};

export const createAnnotation = (input: AnnotationInput) =>
  apiFetch<Annotation>("/annotations", { method: "POST", body: JSON.stringify(input) });

export const updateAnnotation = (id: number, input: AnnotationInput) =>
  apiFetch<Annotation>(`/annotations/${id}`, { method: "PUT", body: JSON.stringify(input) });

export const deleteAnnotation = (id: number) =>
  apiFetch<void>(`/annotations/${id}`, { method: "DELETE" });

// Annotations de l'utilisateur connecté (admin : toutes) pour le tableau de bord.
export const fetchMyAnnotations = () => apiFetch<Annotation[]>("/annotations/mine");

export type AdminStats = {
  annotations: number;
  users: number;
  views: number;
  topRefs: { ref: string; views: number }[];
  viewsByDay: { day: string; views: number }[];
};
export const fetchAdminStats = () => apiFetch<AdminStats>("/admin/stats");

export type AdminAnnotation = {
  id: number;
  ref: string;
  verse: number | null;
  wordIndex: number | null;
  body: string;
  source: string;
  published: boolean;
  author: string | null;
  createdAt: string;
};
export const fetchAdminAnnotations = () => apiFetch<AdminAnnotation[]>("/admin/annotations");

export function recordView(ref: string): void {
  fetch(`${API_BASE}/views`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ref }),
    keepalive: true,
  }).catch(() => {});
}
