import "server-only";

// Vérifie le token auprès de l'API (AdonisJS /me) et exige un rôle éditeur.
// `credit` = signature d'attribution : le philologue (Biblion) signe TOUJOURS « Βιβλίον »
// (jamais son vrai nom) ; un admin signe de son nom réel (Corentin Renard, Noah Jaubert…).
// `id` et `name` servent aux articles (auteur, byline au choix), l'arbitrage n'utilise que
// `ok` et `credit`.
export type EditorAuth = { ok: boolean; id?: number; role?: string; name?: string; credit?: string };

// Résout le token en utilisateur via l'API (/me), sans exiger de rôle particulier.
// Base pour requireEditor (éditeurs) et requireUser (tout compte, ex. profils).
async function fetchUser(authHeader: string | null): Promise<{ id?: number; role?: string; name?: string } | null> {
  const token = authHeader?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  // Base ABSOLUE côté serveur (le /api relatif du client ne résout pas ici).
  const base = process.env.ARB_API_URL || "http://127.0.0.1:3333/api";
  try {
    const r = await fetch(`${base}/me`, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return null;
    const { user } = await r.json();
    if (!user?.role) return null;
    return { id: user.id, role: user.role, name: user.displayName };
  } catch {
    return null;
  }
}

export async function requireEditor(authHeader: string | null): Promise<EditorAuth> {
  const user = await fetchUser(authHeader);
  if (!user) return { ok: false };
  const ok = user.role === "admin" || user.role === "philologist";
  const credit = user.role === "philologist" ? "Βιβλίον" : user.name || "Βιβλίον";
  return { ok, id: user.id, role: user.role, name: user.name, credit };
}

// Tout utilisateur authentifié (n'importe quel rôle) : pour ce qui appartient au
// compte lui-même, comme sa page profil.
export async function requireUser(authHeader: string | null): Promise<EditorAuth> {
  const user = await fetchUser(authHeader);
  if (!user) return { ok: false };
  return { ok: true, id: user.id, role: user.role, name: user.name };
}
