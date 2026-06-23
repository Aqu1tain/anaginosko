// One-time enrichment: tag each word in data-sources/passages.json with its
// verse number, son lemme et sa nature, aligned to the public-domain
// MorphGNT/SBLGNT word list.
// Requires the MorphGNT book files in a local dir (default /tmp/morphgnt).
// Run: node scripts/enrich-verses.mjs
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MORPH_DIR = process.env.MORPH_DIR || "/tmp/morphgnt";

// Code POS MorphGNT -> nature en français.
const NATURE = {
  "N-": "Nom",
  "V-": "Verbe",
  "A-": "Adjectif",
  "D-": "Adverbe",
  "C-": "Conjonction",
  "P-": "Préposition",
  "X-": "Particule",
  "I-": "Interjection",
  RA: "Article",
  RD: "Pronom démonstratif",
  RI: "Pronom indéfini",
  RP: "Pronom personnel",
  RR: "Pronom relatif",
};
const natureOf = (pos) => NATURE[pos] ?? NATURE[pos[0] + "-"] ?? "Autre";

const BOOKS = {
  Jean: { file: "64-Jn", code: "04" },
  Matthieu: { file: "61-Mt", code: "01" },
  "1 Corinthiens": { file: "67-1Co", code: "07" },
  Philippiens: { file: "71-Php", code: "11" },
  Romains: { file: "66-Ro", code: "06" },
  Luc: { file: "63-Lk", code: "03" },
  "1 Jean": { file: "83-1Jn", code: "23" },
  Hébreux: { file: "79-Heb", code: "19" },
  Apocalypse: { file: "87-Re", code: "27" },
};

const norm = (s) =>
  s
    .normalize("NFC")
    .replace(/[’ʼ'`]/g, "")
    .replace(/[.,··;:·;·]/g, "")
    .toLowerCase()
    .trim();

function parseRef(reference) {
  const m = reference.match(/^(.+?)\s+(\d+):(\d+)-(\d+)/);
  if (!m) throw new Error(`Référence illisible : ${reference}`);
  return {
    book: m[1].trim(),
    chapter: Number(m[2]),
    vStart: Number(m[3]),
    vEnd: Number(m[4]),
  };
}

function morphWords({ file, code }, chapter, vStart, vEnd) {
  const path = resolve(MORPH_DIR, `${file}.txt`);
  if (!existsSync(path)) throw new Error(`Fichier MorphGNT manquant : ${path}`);
  const out = [];
  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (!line) continue;
    const parts = line.split(" ");
    const ref = parts[0];
    if (ref.slice(0, 2) !== code) continue;
    const ch = Number(ref.slice(2, 4));
    const v = Number(ref.slice(4, 6));
    if (ch !== chapter || v < vStart || v > vEnd) continue;
    out.push({ verse: v, word: parts[3], lemme: parts[6], nature: natureOf(parts[1]) });
  }
  return out;
}

const passages = JSON.parse(readFileSync(resolve(root, "data-sources/passages.json"), "utf8"));

let totalMismatch = 0;
for (const t of passages.textes) {
  const { book, chapter, vStart, vEnd } = parseRef(t.reference);
  const meta = BOOKS[book];
  if (!meta) throw new Error(`Livre inconnu : ${book}`);
  const ref = morphWords(meta, chapter, vStart, vEnd);

  if (ref.length !== t.mots.length) {
    console.warn(
      `⚠ ${t.reference}: ${ref.length} mots MorphGNT vs ${t.mots.length} mots data, alignement par position ignoré`,
    );
    totalMismatch++;
    continue;
  }

  let wordDiffs = 0;
  t.mots.forEach((mot, i) => {
    if (norm(mot.grec) !== norm(ref[i].word)) wordDiffs++;
    mot.verse = ref[i].verse;
    mot.lemme = ref[i].lemme;
    mot.nature = ref[i].nature;
  });
  const tag = wordDiffs === 0 ? "✓" : `~ (${wordDiffs} variantes d'orthographe)`;
  console.log(`${tag} ${t.reference} : ${ref.length} mots, versets ${vStart}-${vEnd}`);
}

if (totalMismatch > 0) {
  console.error(`\n${totalMismatch} passage(s) non alignés : abandon, rien n'est écrit.`);
  process.exit(1);
}

writeFileSync(
  resolve(root, "data-sources/passages.json"),
  JSON.stringify(passages, null, 2) + "\n",
  "utf8",
);
console.log("\ndata-sources/passages.json enrichi avec les numéros de versets.");
