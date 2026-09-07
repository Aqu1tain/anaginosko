import "server-only";
import { readFile } from "node:fs/promises";
import { request } from "node:https";
import path from "node:path";
import { type BaillyNotice, baillyNoticeFile, toBaillyNotice } from "../src/lib/bailly";

// Notices Bailly : d'abord les fichiers figés dans public/bailly (voir
// scripts/fetch-bailly-notices.mjs ; api.bailly.app refuse les requêtes du VPS),
// puis l'API en repli (dev, lemme récent). Requête HTTPS Node en IPv4 avec un
// vrai délai (le fetch patché par Next peut ignorer le signal d'abandon), cache
// mémoire des succès pour la vie du processus ; les échecs ne sont jamais mémorisés.
const API_HOST = "api.bailly.app";
const STATIC_DIR = path.join(process.cwd(), "public", "bailly");
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

export type BaillyLookup = { notice: BaillyNotice | null; error?: string };

export async function loadBaillyNotice(uri: string, timeoutMs = 4000): Promise<BaillyLookup> {
  if (!uri) return { notice: null, error: "uri vide" };
  const cached = cache.get(uri);
  if (cached) return { notice: cached };
  const frozen = await readFile(path.join(STATIC_DIR, baillyNoticeFile(uri)), "utf8")
    .then((raw) => JSON.parse(raw) as BaillyNotice)
    .catch(() => null);
  if (frozen) {
    cache.set(uri, frozen);
    return { notice: frozen };
  }
  try {
    const json = (await getJson(`/entry/${encodeURIComponent(uri)}?fields=word,uri,htmlDefinition`, timeoutMs)) as {
      data?: { entry?: Parameters<typeof toBaillyNotice>[0] };
    };
    const notice = toBaillyNotice(json.data?.entry, uri);
    if (!notice) return { notice: null, error: "entrée absente" };
    if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value!);
    cache.set(uri, notice);
    return { notice };
  } catch (e) {
    const error = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    console.error(`[bailly] ${uri}: ${error}`);
    return { notice: null, error };
  }
}

export const fetchBaillyNotice = (uri: string, timeoutMs = 4000): Promise<BaillyNotice | null> =>
  loadBaillyNotice(uri, timeoutMs).then((r) => r.notice);
