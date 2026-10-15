// Client de l'API Anaginosko (backend AdonisJS). Base configurable :
// VITE_API_BASE (ex. /api en prod via nginx ; http://localhost:3333/api en dev).
import type { Permission } from "../data/permissions";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "/api";
const TOKEN_KEY = "anaginosko:token";

export type { Permission };
// Identité + permissions granulaires. `email` : renvoyé par /me pour le titulaire.
// `isRoot` : compte racine (toutes les permissions, verrouillé).
export type AuthUser = {
  id: number;
  displayName: string;
  title: string;
  permissions: Permission[];
  isRoot: boolean;
  email?: string;
  newsletter?: boolean;
};

// Un compte a-t-il une permission ? Les comptes racine les ont toutes.
export const can = (user: AuthUser | null | undefined, permission: Permission): boolean =>
  !!user && (user.isRoot || user.permissions.includes(permission));

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
  author: { displayName: string; title: string } | null;
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

// Copie du jeton en cookie : les pages serveur (leçons réservées aux comptes) le
// lisent pour afficher le contenu. Même exposition que le localStorage.
export const SESSION_COOKIE = "anaginosko_session";
export const syncSessionCookie = (t: string | null) => {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = t
    ? `${SESSION_COOKIE}=${encodeURIComponent(t)}; Path=/; Max-Age=${30 * 24 * 3600}; SameSite=Lax${secure}`
    : `${SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
};

const setToken = (t: string | null) => {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
    syncSessionCookie(t);
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

// Connexion sans mot de passe : code temporaire envoyé par e-mail, ou Google.
export const startEmailLogin = (email: string) =>
  apiFetch<{ ok: boolean; message: string }>("/auth/email/start", { method: "POST", body: JSON.stringify({ email }) });

type Session = { token: string; user: AuthUser; created: boolean };

async function openSession(path: string, body: object): Promise<Session> {
  const data = await apiFetch<Session>(path, { method: "POST", body: JSON.stringify(body) });
  setToken(data.token);
  return data;
}

// `newsletter` : consentement donné à l'inscription, ignoré pour un compte existant.
export const verifyEmailLogin = (email: string, code: string, newsletter = false) =>
  openSession("/auth/email/verify", { email, code, newsletter });
export const googleLogin = (credential: string, newsletter = false) => openSession("/auth/google", { credential, newsletter });

export const fetchAuthProviders = () =>
  apiFetch<{ googleClientId: string | null }>("/auth/providers").catch(() => ({ googleClientId: null }));

// Apprenant : compte sans aucune permission (ni rôle, ni racine).
export const isLearner = (user: AuthUser | null | undefined): boolean =>
  !!user && !user.isRoot && user.permissions.length === 0;

export async function logout(): Promise<void> {
  try {
    await apiFetch("/logout", { method: "POST" });
  } catch {
    /* ignore */
  }
  setToken(null);
}

export const fetchMe = () => apiFetch<{ user: AuthUser }>("/me").then((d) => d.user);

// Nom affiché du compte. L'e-mail ne se change pas ici : il sert à se connecter.
export const updateMe = (patch: { displayName?: string; newsletter?: boolean }) =>
  apiFetch<{ user: AuthUser }>("/me", { method: "PUT", body: JSON.stringify(patch) }).then((d) => d.user);

// Suppression de son propre compte d'apprenant (refusée aux comptes de l'équipe).
export async function deleteMe(): Promise<void> {
  await apiFetch<void>("/me", { method: "DELETE" });
  setToken(null);
}

// Désinscription en un clic depuis un e-mail (lien porteur d'un jeton).
export const unsubscribe = (token: string) =>
  apiFetch<{ ok: boolean }>("/newsletter/unsubscribe", { method: "POST", body: JSON.stringify({ token }) });

// Progression dans les cours.
export type LessonProgress = { courseId: string; lessonId: string; completedAt: string };
export const fetchProgress = () =>
  apiFetch<{ progress: LessonProgress[] }>("/learning/progress").then((d) => d.progress);
export const setLessonDone = (courseId: string, lessonId: string, done: boolean) =>
  apiFetch<{ ok: boolean }>("/learning/progress", { method: "PUT", body: JSON.stringify({ courseId, lessonId, done }) });

// --- Gestion des comptes (admin) ---
export type Contributor = {
  roleIds: number[];
  effectivePermissions: Permission[];
  id: number;
  email: string;
  displayName: string;
  title: string;
  permissions: Permission[];
  isRoot: boolean;
  active: boolean;
  createdAt: string | null;
};
export type Invitation = {
  roleIds: number[];
  id: number;
  email: string;
  displayName: string;
  title: string;
  permissions: Permission[];
  expiresAt: string | null;
  createdAt: string | null;
};

export const fetchContributors = () =>
  apiFetch<{ users: Contributor[]; invitations: Invitation[]; learners?: number }>("/admin/users");

export const inviteContributor = (input: { email: string; displayName: string; title: string; permissions: Permission[]; roleIds?: number[] }) =>
  apiFetch<{ invitation: Invitation }>("/admin/invitations", { method: "POST", body: JSON.stringify(input) }).then((d) => d.invitation);

export const updateContributor = (id: number, patch: { title?: string; permissions?: Permission[]; active?: boolean; roleIds?: number[] }) =>
  apiFetch<{ user: Contributor }>(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(patch) }).then((d) => d.user);

export const cancelInvitation = (id: number) =>
  apiFetch<void>(`/admin/invitations/${id}`, { method: "DELETE" });

export type EditorialRole = { id: number; name: string; permissions: Permission[] };
export const fetchRoles = () => apiFetch<{ roles: EditorialRole[] }>("/admin/roles").then(d => d.roles);
export const saveRole = (role: { id?: number; name: string; permissions: Permission[] }) =>
  apiFetch<{ role: EditorialRole }>(`/admin/roles${role.id ? `/${role.id}` : ""}`, { method: role.id ? "PUT" : "POST", body: JSON.stringify(role) }).then(d => d.role);

// --- Invitation publique (le contributeur définit son mot de passe) ---
export const fetchInvitation = (token: string) =>
  apiFetch<{ invitation: { email: string; displayName: string; title: string } }>(
    `/invitations/${encodeURIComponent(token)}`,
  ).then((d) => d.invitation);

export async function acceptInvitation(token: string): Promise<AuthUser> {
  const data = await apiFetch<{ token: string; user: AuthUser }>(
    `/invitations/${encodeURIComponent(token)}/accept`,
    { method: "POST", body: JSON.stringify({}) },
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
// uniqueVisitors vaut null quand Matomo ne le calcule pas sur une plage de dates.
export type MatomoSummary = {
  visits: number;
  uniqueVisitors: number | null;
  pageviews: number;
  uniquePageviews: number;
  actionsPerVisit: number;
  avgTimeOnSite: number;
  bounceRate: number;
};
export type MatomoDay = { day: string; visits: number; uniqueVisitors?: number; pageviews?: number };
// Champs optionnels : absents tant que l'API en prod n'a pas été promue.
export type MatomoAnalytics = {
  configured: boolean;
  visitsByDay: MatomoDay[];
  referrerTypes: NamedCount[];
  topReferrers: NamedCount[];
  devices: NamedCount[];
  countries: NamedCount[];
  summary?: MatomoSummary;
  previous?: MatomoSummary;
  topPages?: { label: string; visits: number; pageviews: number }[];
  aiReferrals?: { total: number; sources: NamedCount[] };
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
  | "demande_note"
  | "lecture";
export type ReportStatus = "pending" | "in_progress" | "resolved" | "rejected";

export type ReportInput = {
  category: ReportCategory;
  email?: string;
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
