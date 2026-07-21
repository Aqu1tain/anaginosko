import "server-only";
import type { Permission } from "@/src/data/permissions";

// Vérifie le token auprès de l'API (AdonisJS /me) et exige une permission.
// `credit` = signature d'attribution d'arbitrage : un compte racine signe de son
// nom réel, tout autre contributeur signe collectivement « Βιβλίον ».
// `id` et `name` servent aux articles (auteur, byline).
export type EditorAuth = {
  ok: boolean;
  id?: number;
  permissions?: Permission[];
  isRoot?: boolean;
  name?: string;
  credit?: string;
};

type ResolvedUser = { id?: number; permissions: Permission[]; isRoot: boolean; name?: string };

// Résout le token en utilisateur via l'API (/me), sans exiger de permission.
async function fetchUser(authHeader: string | null): Promise<ResolvedUser | null> {
  const token = authHeader?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  // Base ABSOLUE côté serveur (le /api relatif du client ne résout pas ici).
  const base = process.env.ARB_API_URL || "http://127.0.0.1:3333/api";
  try {
    const r = await fetch(`${base}/me`, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return null;
    const { user } = await r.json();
    if (!user) return null;
    return { id: user.id, permissions: user.permissions ?? [], isRoot: !!user.isRoot, name: user.displayName };
  } catch {
    return null;
  }
}

const has = (u: ResolvedUser, p: Permission) => u.isRoot || u.permissions.includes(p);
const creditOf = (u: ResolvedUser) => (u.isRoot ? u.name || "Βιβλίον" : "Βιβλίον");

// Exige une permission précise (les comptes racine les ont toutes).
export async function requirePermission(authHeader: string | null, permission: Permission): Promise<EditorAuth> {
  const user = await fetchUser(authHeader);
  if (!user) return { ok: false };
  return {
    ok: has(user, permission),
    id: user.id,
    permissions: user.permissions,
    isRoot: user.isRoot,
    name: user.name,
    credit: creditOf(user),
  };
}

// Tout utilisateur authentifié (n'importe quelle permission) : pour ce qui
// appartient au compte lui-même, comme sa page profil.
export async function requireUser(authHeader: string | null): Promise<EditorAuth> {
  const user = await fetchUser(authHeader);
  if (!user) return { ok: false };
  return { ok: true, id: user.id, permissions: user.permissions, isRoot: user.isRoot, name: user.name, credit: creditOf(user) };
}
