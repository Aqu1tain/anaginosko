import "server-only";
import fs from "node:fs";
import path from "node:path";

// Traductions maison du NT, verset par verset : elles remplacent le néo-Crampon à
// l'affichage, créditées à part. Stockées dans ARB_DIR (inscriptible et persistant,
// comme l'arbitrage LXX) ; le fr.json servi par nginx n'est jamais réécrit.
export type NtMaison = { maison: string; by: string; at: string };
type Store = Record<string, Record<string, NtMaison>>;

const FILE = path.join(process.env.ARB_DIR || process.env.ARB_STATIC_DIR || path.join(process.cwd(), "data"), "nt-maison.json");

export function ntMaison(): Store {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    return {};
  }
}

export function saveNtMaison(book: string, changes: { ref: string; maison: string | null }[], by: string) {
  const all = ntMaison();
  const entries = (all[book] ??= {});
  const at = new Date().toISOString();
  for (const { ref, maison } of changes) {
    if (maison) entries[ref] = { maison, by, at };
    else delete entries[ref];
  }
  const tmp = `${FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(all, null, 2));
  fs.renameSync(tmp, FILE);
}
