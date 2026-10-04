// Repère les versets LXX où le français lié est nettement plus court que le grec :
// candidats à une traduction maison (passage omis par Giguet, cf. Gn 11:13, KAN-67).
// Heuristique de tri, pas une preuve : Biblion tranche dans l'onglet « À traduire ».
// Lit l'arbitrage git (data/), comme le build. Écrit data/lxx-a-traduire-candidats.json.
//   node scripts/build-a-traduire.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { materializeEntry } from "../lib/lxx-materialize.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(resolve(root, p), "utf8"));
const MIN_GREEK_WORDS = 12;
const MAX_RATIO = 0.6;

const giguet = read("data/giguet-lxx.json");
const links = read("data/lxx-links.json");
const arbitration = read("data/lxx-arbitration.json");
const { books } = read("public/lxx/books.json");
const words = (text) => text.split(/\s+/).filter(Boolean).length;

const candidates = [];
for (const book of books) {
  const chapters = book.chapterList ?? Array.from({ length: book.chapters }, (_, i) => i + 1);
  for (const ch of chapters) {
    const byVerse = {};
    for (const m of read(`public/lxx/${book.id}/${ch}.json`).mots) (byVerse[m.verse] ??= []).push(m.grec);
    for (const [v, greek] of Object.entries(byVerse)) {
      const ref = `${ch}:${v}`;
      const override = arbitration[book.id]?.[ref];
      if (override?.maison || greek.length < MIN_GREEK_WORDS) continue;
      const sources = override ? override.sources : links[book.id]?.[ref];
      if (!sources?.length) continue;
      const french = materializeEntry(giguet[book.id], { sources }) ?? "";
      const ratio = words(french) / greek.length;
      if (ratio < MAX_RATIO) candidates.push({ book: book.id, ref, greekWords: greek.length, frenchWords: words(french), ratio: Math.round(ratio * 100) / 100 });
    }
  }
}

candidates.sort((a, b) => a.ratio - b.ratio);
writeFileSync(resolve(root, "data/lxx-a-traduire-candidats.json"), JSON.stringify({ generated: "scripts/build-a-traduire.mjs", minGreekWords: MIN_GREEK_WORDS, maxRatio: MAX_RATIO, candidates }, null, 1) + "\n");
console.log(`${candidates.length} candidats (grec ≥ ${MIN_GREEK_WORDS} mots, français < ${MAX_RATIO} mot par mot grec).`);
