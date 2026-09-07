import "server-only";
import { request } from "node:https";
import { type BaillyNotice, toBaillyNotice } from "../src/lib/bailly";

// Proxy serveur vers api.bailly.app : le visiteur ne contacte jamais le tiers.
// Requête HTTPS Node en IPv4 avec un vrai délai (le fetch patché par Next peut
// ignorer le signal d'abandon), cache mémoire des succès pour la vie du
// processus (le Bailly 2020 ne bouge pas) ; les échecs ne sont jamais mémorisés.
const API_HOST = "api.bailly.app";
const MAX_ENTRIES = 5000;
const cache = new Map<string, BaillyNotice>();

function getJson(path: string, timeoutMs: number): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const req = request(
      { host: API_HOST, path, method: "GET", family: 4, headers: { accept: "application/json" } },
      (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
          } catch (e) {
            reject(e);
          }
        });
        res.on("error", reject);
      },
    );
    req.setTimeout(timeoutMs, () => req.destroy(new Error("timeout")));
    req.on("error", reject);
    req.end();
  });
}

export async function fetchBaillyNotice(uri: string, timeoutMs = 4000): Promise<BaillyNotice | null> {
  if (!uri) return null;
  const cached = cache.get(uri);
  if (cached) return cached;
  try {
    const json = (await getJson(`/entry/${encodeURIComponent(uri)}?fields=word,uri,htmlDefinition`, timeoutMs)) as {
      data?: { entry?: Parameters<typeof toBaillyNotice>[0] };
    };
    const notice = toBaillyNotice(json.data?.entry, uri);
    if (!notice) return null;
    if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value!);
    cache.set(uri, notice);
    return notice;
  } catch {
    return null;
  }
}
