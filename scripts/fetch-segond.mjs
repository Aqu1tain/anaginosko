// One-time fetch: récupère la traduction Louis Segond 1910 (domaine public)
// pour chaque passage et l'écrit, verset par verset, dans
// data-sources/passages.json (champ `francais`). Le build ne dépend pas du réseau.
// Source : bolls.life (translation FRLSG). Run: node scripts/fetch-segond.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Nom français du livre -> numéro de livre bolls (canon, 1-66).
const BOOK_NUM = {
  Matthieu: 40,
  Luc: 42,
  Jean: 43,
  Romains: 45,
  "1 Corinthiens": 46,
  Philippiens: 50,
  Hébreux: 58,
  "1 Jean": 62,
  Apocalypse: 66,
};

const stripHtml = (s) =>
  s
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();

function parseRef(reference) {
  const m = reference.match(/^(.+?)\s+(\d+):(\d+)-(\d+)/);
  if (!m) throw new Error(`Référence illisible : ${reference}`);
  return { book: m[1].trim(), chapter: +m[2], vStart: +m[3], vEnd: +m[4] };
}

async function chapterVerses(bookNum, chapter) {
  const url = `https://bolls.life/get-text/FRLSG/${bookNum}/${chapter}/`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} pour ${url}`);
  return res.json();
}

const passages = JSON.parse(readFileSync(resolve(root, "data-sources/passages.json"), "utf8"));

for (const t of passages.textes) {
  const { book, chapter, vStart, vEnd } = parseRef(t.reference);
  const bookNum = BOOK_NUM[book];
  if (!bookNum) throw new Error(`Livre inconnu : ${book}`);

  const verses = await chapterVerses(bookNum, chapter);
  const byVerse = new Map(verses.map((v) => [v.verse, stripHtml(v.text)]));

  const francais = {};
  let missing = 0;
  for (let v = vStart; v <= vEnd; v++) {
    if (byVerse.has(v)) francais[v] = byVerse.get(v);
    else missing++;
  }
  t.francais = francais;
  console.log(
    `${missing ? "⚠" : "✓"} ${t.reference} : ${Object.keys(francais).length} versets${missing ? ` (${missing} manquants)` : ""}`,
  );
}

writeFileSync(
  resolve(root, "data-sources/passages.json"),
  JSON.stringify(passages, null, 2) + "\n",
  "utf8",
);
console.log("\nSegond 1910 écrit dans data-sources/passages.json (champ francais).");
