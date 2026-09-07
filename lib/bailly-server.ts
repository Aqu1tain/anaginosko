import "server-only";
import { type BaillyNotice, toBaillyNotice } from "../src/lib/bailly";

// Proxy serveur vers api.bailly.app : le visiteur ne contacte jamais le tiers,
// et la notice est mise en cache un mois (le Bailly 2020 ne bouge pas).
const API = "https://api.bailly.app";
const MONTH = 60 * 60 * 24 * 30;

export async function fetchBaillyNotice(uri: string, timeoutMs = 4000): Promise<BaillyNotice | null> {
  if (!uri) return null;
  try {
    const res = await fetch(`${API}/entry/${encodeURIComponent(uri)}?fields=word,uri,htmlDefinition`, {
      next: { revalidate: MONTH },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: { entry?: Parameters<typeof toBaillyNotice>[0] } };
    return toBaillyNotice(json.data?.entry, uri);
  } catch {
    return null;
  }
}
