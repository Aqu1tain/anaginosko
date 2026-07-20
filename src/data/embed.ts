// Validation des intégrations (cartes, vidéos, graphiques) contre une liste blanche
// de domaines de confiance. Appliquée à la SAISIE (éditeur) ET au RENDU (serveur) :
// une URL non conforme n'est jamais insérée dans un iframe. Module pur.

export const EMBED_ALLOWLIST = "YouTube, Google Maps, OpenStreetMap / uMap, Datawrapper";

function youtubeId(u: URL): string | null {
  if (u.hostname === "youtu.be") return u.pathname.slice(1) || null;
  if (/(^|\.)youtube\.com$/.test(u.hostname)) {
    if (u.pathname === "/watch") return u.searchParams.get("v");
    const m = u.pathname.match(/^\/embed\/([^/]+)/);
    if (m) return m[1];
  }
  return null;
}

// Renvoie une URL sûre à intégrer, ou null si le domaine n'est pas autorisé. YouTube
// est normalisé vers youtube-nocookie/embed ; les autres domaines sont acceptés tels
// quels sur leurs chemins d'intégration.
export function normalizeEmbedUrl(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;

  const id = youtubeId(u);
  if (id) return /^[\w-]{6,20}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;

  const host = u.hostname;
  const allowed =
    (host === "www.google.com" && u.pathname.startsWith("/maps/embed")) ||
    (host === "www.openstreetmap.org" && u.pathname.startsWith("/export/embed.html")) ||
    host === "umap.openstreetmap.fr" ||
    host === "datawrapper.dwcdn.net";
  return allowed ? u.toString() : null;
}
