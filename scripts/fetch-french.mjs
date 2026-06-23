// One-time fetch: récupère la traduction française CATHOLIQUE (néo-Crampon
// libre) pour chaque passage et l'écrit, verset par verset, dans
// data-sources/passages.json (champ `francais`). Le build ne dépend pas du réseau.
// Source : bible.helloao.org, translation fra_ncl. Run: node scripts/fetch-french.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TRANSLATION = "fra_ncl"; // Sainte Bible néo-Crampon Libre (catholique, libre)

// Nom français du livre -> code USFM (helloao).
const USFM = {
  Matthieu: "MAT",
  Luc: "LUK",
  Jean: "JHN",
  Romains: "ROM",
  "1 Corinthiens": "1CO",
  Philippiens: "PHP",
  Hébreux: "HEB",
  "1 Jean": "1JN",
  Apocalypse: "REV",
};

function parseRef(reference) {
  const m = reference.match(/^(.+?)\s+(\d+):(\d+)-(\d+)/);
  if (!m) throw new Error(`Référence illisible : ${reference}`);
  return { book: m[1].trim(), chapter: +m[2], vStart: +m[3], vEnd: +m[4] };
}

const verseText = (verse) =>
  (verse.content || [])
    .map((c) => (typeof c === "string" ? c : (c && c.text) || ""))
    .join(" ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?·])/g, "$1")
    .trim();

async function chapterVerses(usfm, chapter) {
  const url = `https://bible.helloao.org/api/${TRANSLATION}/${usfm}/${chapter}.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} pour ${url}`);
  const data = await res.json();
  const map = new Map();
  for (const item of data.chapter?.content ?? []) {
    if (item && item.type === "verse") map.set(item.number, verseText(item));
  }
  return map;
}

const passages = JSON.parse(readFileSync(resolve(root, "data-sources/passages.json"), "utf8"));

for (const t of passages.textes) {
  const { book, chapter, vStart, vEnd } = parseRef(t.reference);
  const usfm = USFM[book];
  if (!usfm) throw new Error(`Livre inconnu : ${book}`);

  const byVerse = await chapterVerses(usfm, chapter);
  const francais = {};
  let missing = 0;
  for (let v = vStart; v <= vEnd; v++) {
    if (byVerse.get(v)) francais[v] = byVerse.get(v);
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
console.log("\nFrançais (néo-Crampon libre) écrit dans data-sources/passages.json.");
