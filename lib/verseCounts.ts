import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { chapterNumbers } from "../src/data/nt";
import type { CorpusConfig } from "../src/data/corpus";
import { loadBooksFs } from "./nt-server";

// Versets grecs par livre (et par chapitre), lus une fois dans les chapitres.
export type VerseCounts = Record<string, { total: number; chapters: Record<number, number> }>;
const cache = new Map<string, Promise<VerseCounts>>();

export function verseCounts(c: CorpusConfig): Promise<VerseCounts> {
  const hit = cache.get(c.id);
  if (hit) return hit;
  const dir = process.env[c.dataDirEnv] || path.join(process.cwd(), "public", c.dataPrefix);
  const job = (async () => {
    const out: VerseCounts = {};
    for (const b of await loadBooksFs(c)) {
      const chapters: Record<number, number> = {};
      for (const ch of chapterNumbers(b)) {
        const { mots } = JSON.parse(await readFile(path.join(dir, b.id, `${ch}.json`), "utf8")) as { mots: { verse: number | null }[] };
        chapters[ch] = new Set(mots.map((m) => m.verse).filter((v) => v !== null)).size;
      }
      out[b.id] = { total: Object.values(chapters).reduce((n, x) => n + x, 0), chapters };
    }
    return out;
  })();
  cache.set(c.id, job);
  job.catch(() => cache.delete(c.id));
  return job;
}
