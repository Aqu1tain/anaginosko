import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { chapterNumbers } from "../src/data/nt";
import type { CorpusConfig } from "../src/data/corpus";
import { loadBooksFs } from "./nt-server";

// Lemmes de chaque verset (« livre ch:v »), lus une fois dans les chapitres : la base
// des vérifications de termes clés sur tout un corpus.
const cache = new Map<string, Promise<Map<string, string[]>>>();

export function verseLemmas(c: CorpusConfig): Promise<Map<string, string[]>> {
  const hit = cache.get(c.id);
  if (hit) return hit;
  const dir = process.env[c.dataDirEnv] || path.join(process.cwd(), "public", c.dataPrefix);
  const job = (async () => {
    const out = new Map<string, string[]>();
    for (const b of await loadBooksFs(c)) {
      for (const ch of chapterNumbers(b)) {
        const { mots } = JSON.parse(await readFile(path.join(dir, b.id, `${ch}.json`), "utf8")) as { mots: { verse: number | null; lemme: string | null }[] };
        for (const m of mots) {
          if (m.verse === null || !m.lemme) continue;
          const key = `${b.id} ${ch}:${m.verse}`;
          (out.get(key) ?? out.set(key, []).get(key)!).push(m.lemme);
        }
      }
    }
    return out;
  })();
  cache.set(c.id, job);
  job.catch(() => cache.delete(c.id));
  return job;
}
