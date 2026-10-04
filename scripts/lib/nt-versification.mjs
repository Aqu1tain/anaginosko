// Recale le français du NT (néo-Crampon, numérotation Vulgate par endroits) sur la
// numérotation du grec SBLGNT, d'après data/nt-versification.json. Les valeurs sont
// explicites : appliquer deux fois donne le même résultat.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const tablePath = resolve(dirname(fileURLToPath(import.meta.url)), "../../data/nt-versification.json");
export const versificationTable = () => JSON.parse(readFileSync(tablePath, "utf8"));

export function applyVersification(bookId, chapters, table = versificationTable()) {
  const fixes = table[bookId];
  if (!fixes) return chapters;
  for (const [ch, { set = {}, drop = [] }] of Object.entries(fixes)) {
    const verses = { ...(chapters[ch] ?? {}) };
    for (const v of drop) delete verses[v];
    Object.assign(verses, set);
    chapters[ch] = Object.fromEntries(Object.entries(verses).sort(([a], [b]) => Number(a) - Number(b)));
  }
  return chapters;
}
