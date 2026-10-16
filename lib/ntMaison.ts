import "server-only";

// Traductions maison du NT, verset par verset, stockées dans la base de l'API (avec
// historique). Elles remplacent le néo-Crampon à l'affichage, créditées à part.
export type NtMaison = { maison: string; by: string; at: string };
type Store = Record<string, Record<string, NtMaison>>;
export type NtRevision = { text: string | null; by: string; at: string };

const API = process.env.ARB_API_URL || "http://127.0.0.1:3333/api";
const TTL_MS = 30_000;
export const NT_MAISON_TAG = "nt-maison";
export const houseTag = (corpus: string) => (corpus === "nt" ? NT_MAISON_TAG : `${corpus}-maison`);
const caches = new Map<string, { at: number; store: Store }>();

// Cache de données Next (30 s, étiquette purgée à la publication) : un fetch
// « no-store » ferait échouer en production le rendu ISR des pages qui l'appellent.
// En mémoire 30 s. Si l'API ne répond pas, la dernière copie connue sert ; sans copie,
// on échoue plutôt que de servir la traduction de base à la place d'une traduction
// maison (le cache ISR garderait alors la page fausse). Seul le build, sans API, part de zéro.
export async function houseMaison(corpus: string): Promise<Store> {
  const cache = caches.get(corpus);
  if (cache && Date.now() - cache.at < TTL_MS) return cache.store;
  try {
    const r = await fetch(`${API}/translations?corpus=${corpus}`, {
      next: { revalidate: 30, tags: [houseTag(corpus)] },
      signal: AbortSignal.timeout(4000),
    });
    if (!r.ok) throw new Error(`API traductions : ${r.status}`);
    const store = (await r.json()).translations as Store;
    caches.set(corpus, { at: Date.now(), store });
    return store;
  } catch (e) {
    if (cache) return cache.store;
    if (process.env.NEXT_PHASE === "phase-production-build") return {};
    throw e;
  }
}

export const ntMaison = () => houseMaison("nt");
export const forgetHouseMaison = (corpus: string) => caches.delete(corpus);

async function call(path: string, authHeader: string, init?: RequestInit) {
  const r = await fetch(`${API}${path}`, {
    ...init,
    cache: "no-store",
    headers: { Authorization: authHeader, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  return { status: r.status, body: await r.json().catch(() => null) };
}

export async function saveNtMaison(authHeader: string, book: string, changes: { ref: string; maison: string | null }[]) {
  const result = await call("/translations", authHeader, {
    method: "PUT",
    body: JSON.stringify({ corpus: "nt", book, changes: changes.map((c) => ({ ref: c.ref, text: c.maison })) }),
  });
  if (result.status < 300) forgetHouseMaison("nt");
  return result;
}

export const ntHistory = (authHeader: string, book: string, ref: string) =>
  call(`/translations/history?corpus=nt&book=${encodeURIComponent(book)}&ref=${encodeURIComponent(ref)}`, authHeader);
