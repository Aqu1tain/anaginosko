import "server-only";

// Vérifie le token auprès de l'API (AdonisJS /me) et exige un rôle éditeur.
// `credit` = signature d'attribution : le philologue (Biblion) signe TOUJOURS « Βιβλίον »
// (jamais son vrai nom) ; un admin signe de son nom réel (Corentin Renard, Noah Jaubert…).
// `id` et `name` servent aux articles (auteur, byline au choix), l'arbitrage n'utilise que
// `ok` et `credit`.
export type EditorAuth = { ok: boolean; id?: number; role?: string; name?: string; credit?: string };

export async function requireEditor(authHeader: string | null): Promise<EditorAuth> {
  const token = authHeader?.replace(/^Bearer\s+/i, "");
  if (!token) return { ok: false };
  // Base ABSOLUE côté serveur (le /api relatif du client ne résout pas ici).
  const base = process.env.ARB_API_URL || "http://127.0.0.1:3333/api";
  try {
    const r = await fetch(`${base}/me`, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return { ok: false };
    const { user } = await r.json();
    const ok = user?.role === "admin" || user?.role === "philologist";
    const credit = user?.role === "philologist" ? "Βιβλίον" : user?.displayName || "Βιβλίον";
    return { ok, id: user?.id, role: user?.role, name: user?.displayName, credit };
  } catch {
    return { ok: false };
  }
}
