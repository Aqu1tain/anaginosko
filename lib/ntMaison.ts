import "server-only";

// Traductions maison du NT, verset par verset, stockées dans la base de l'API (avec
// historique). Elles remplacent le néo-Crampon à l'affichage, créditées à part.
export type NtMaison = { maison: string; by: string; at: string };
type Store = Record<string, Record<string, NtMaison>>;
export type NtRevision = { text: string | null; by: string; at: string };

const API = process.env.ARB_API_URL || "http://127.0.0.1:3333/api";
const TTL_MS = 30_000;
let cache: { at: number; store: Store } | null = null;

// En mémoire 30 s. Si l'API ne répond pas, la dernière copie connue sert ; sans copie,
// on échoue plutôt que de servir le Crampon à la place d'une traduction maison (le
// cache ISR garderait alors la page fausse). Seul le build, sans API, part de zéro.
export async function ntMaison(): Promise<Store> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.store;
  try {
    const r = await fetch(`${API}/translations?corpus=nt`, { cache: "no-store", signal: AbortSignal.timeout(4000) });
    if (!r.ok) throw new Error(`API traductions : ${r.status}`);
    cache = { at: Date.now(), store: (await r.json()).translations };
    return cache.store;
  } catch (e) {
    if (cache) return cache.store;
    if (process.env.NEXT_PHASE === "phase-production-build") return {};
    throw e;
  }
}

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
  if (result.status < 300) cache = null;
  return result;
}

export const ntHistory = (authHeader: string, book: string, ref: string) =>
  call(`/translations/history?corpus=nt&book=${encodeURIComponent(book)}&ref=${encodeURIComponent(ref)}`, authHeader);
