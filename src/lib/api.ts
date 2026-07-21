// Client de l'API Anaginosko (backend AdonisJS). Base configurable :
// VITE_API_BASE (ex. /api en prod via nginx ; http://localhost:3333/api en dev).
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "/api";
const TOKEN_KEY = "anaginosko:token";

export type Role = "admin" | "philologist" | "reader";
// `email` : renvoyé par /me pour le compte lui-même (versions récentes de l'API).
export type AuthUser = { id: number; displayName: string; role: Role; email?: string };

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

// Mise à jour du compte (e-mail de connexion, nom de compte). Nécessite une API
// récente : sur une API antérieure, la route n'existe pas (404) et l'appelant doit
// dégrader proprement.
export const updateMe = (patch: { email?: string; displayName?: string }) =>
  apiFetch<{ user: AuthUser }>("/me", { method: "PUT", body: JSON.stringify(patch) }).then((d) => d.user);

// Changement de mot de passe par le titulaire (vérifie le mot de passe actuel).
export const changePassword = (currentPassword: string, newPassword: string) =>
  apiFetch<void>("/me/password", { method: "PUT", body: JSON.stringify({ currentPassword, newPassword }) });

// --- Gestion des comptes (admin) ---
export type InvitableRole = "admin" | "philologist";
export type Contributor = { id: number; email: string; displayName: string; role: Role; active: boolean; createdAt: string | null };
export type Invitation = { id: number; email: string; displayName: string; role: InvitableRole; expiresAt: string | null; createdAt: string | null };

export const fetchContributors = () =>
  apiFetch<{ users: Contributor[]; invitations: Invitation[] }>("/admin/users");

export const inviteContributor = (input: { email: string; displayName: string; role: InvitableRole }) =>
  apiFetch<{ invitation: Invitation }>("/admin/invitations", { method: "POST", body: JSON.stringify(input) }).then((d) => d.invitation);

export const updateContributor = (id: number, patch: { role?: Role; active?: boolean }) =>
  apiFetch<{ user: Contributor }>(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(patch) }).then((d) => d.user);

export const cancelInvitation = (id: number) =>
  apiFetch<void>(`/admin/invitations/${id}`, { method: "DELETE" });

// --- Invitation publique (le contributeur définit son mot de passe) ---
export const fetchInvitation = (token: string) =>
  apiFetch<{ invitation: { email: string; displayName: string; role: InvitableRole } }>(
    `/invitations/${encodeURIComponent(token)}`,
  ).then((d) => d.invitation);

export async function acceptInvitation(token: string, password: string): Promise<AuthUser> {
  const data = await apiFetch<{ token: string; user: AuthUser }>(
    `/invitations/${encodeURIComponent(token)}/accept`,
    { method: "POST", body: JSON.stringify({ password }) },
  );
  setToken(data.token);
  return data.user;
}

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

// --- Override de prononciation (cas par cas, admin/philologue) ---
export type System = "erasmien" | "restituee";

export type PronunciationOverride = {
  id: number;
  ref: string;
  wordIndex: number;
  system: System;
  grec: string;
  ipa: string;
  translit: string | null;
  audioUrl: string;
};

// Tous les overrides (s'appliquent par forme = mot grec, donc à toutes les occurrences).
export const fetchPronunciations = () => apiFetch<PronunciationOverride[]>("/pronunciations");

export type PronunciationInput = {
  ref: string;
  wordIndex: number;
  system: System;
  grec: string;
  ipa: string;
  translit: string;
};

export const createPronunciation = (input: PronunciationInput) =>
  apiFetch<PronunciationOverride>("/pronunciations", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const deletePronunciation = (id: number) =>
  apiFetch<void>(`/pronunciations/${id}`, { method: "DELETE" });

export type AdminStats = {
  annotations: number;
  users: number;
  views: number;
  topRefs: { ref: string; views: number }[];
  viewsByDay: { day: string; views: number }[];
};
export const fetchAdminStats = (days?: number) =>
  apiFetch<AdminStats>(`/admin/stats${days ? `?days=${days}` : ""}`);

export type NamedCount = { label: string; visits: number };
export type MatomoAnalytics = {
  configured: boolean;
  visitsByDay: { day: string; visits: number }[];
  referrerTypes: NamedCount[];
  topReferrers: NamedCount[];
  devices: NamedCount[];
  countries: NamedCount[];
};
export const fetchMatomoAnalytics = (days?: number) =>
  apiFetch<MatomoAnalytics>(`/admin/analytics${days ? `?days=${days}` : ""}`);

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

export type ReportCategory =
  | "traduction"
  | "texte"
  | "commentaire"
  | "definition"
  | "demande_note";
export type ReportStatus = "pending" | "in_progress" | "resolved" | "rejected";

export type ReportInput = {
  category: ReportCategory;
  email: string;
  message: string;
  ref?: string | null;
  verse?: number | null;
  wordIndex?: number | null;
  endWordIndex?: number | null;
  graphemeIndex?: number | null;
  annotationId?: number | null;
  website?: string; // honeypot
};

export type AdminReport = {
  id: number;
  category: ReportCategory;
  status: ReportStatus;
  email: string;
  verified: boolean;
  verifiedAt: string | null;
  ref: string | null;
  verse: number | null;
  wordIndex: number | null;
  endWordIndex: number | null;
  graphemeIndex: number | null;
  annotationId: number | null;
  annotation: { body: string; source: string } | null;
  message: string;
  createdAt: string;
};

// Dépôt anonyme d'un signalement (apiFetch fonctionne sans jeton).
export const createReport = (input: ReportInput) =>
  apiFetch<{ ok: boolean; message: string }>("/reports", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const verifyReport = (token: string) =>
  apiFetch<{ ok: boolean; message: string }>("/reports/verify", {
    method: "POST",
    body: JSON.stringify({ token }),
  });

export const fetchAdminReports = (filters?: { status?: ReportStatus; category?: ReportCategory }) => {
  const q = new URLSearchParams();
  if (filters?.status) q.set("status", filters.status);
  if (filters?.category) q.set("category", filters.category);
  const qs = q.toString();
  return apiFetch<AdminReport[]>(`/admin/reports${qs ? `?${qs}` : ""}`);
};

export const updateReportStatus = (id: number, status: ReportStatus) =>
  apiFetch<AdminReport>(`/admin/reports/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
