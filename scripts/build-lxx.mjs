// Ingestion de la Septante (Rahlfs 1935, dépôt eliranwong/LXX-Rahlfs-1935) ->
// données statiques, miroir exact de build-nt.mjs.
// Sortie :
//   public/lxx/books.json            { books:[{id,name,usfm,chapters,words,canon}] }
//   public/lxx/<id>/<chapter>.json   { reference, mots:[{grec,erasmien,restituee,verse,lemme,nature,morph?}] }
//   public/lxx/lemmas.json           index des lemmes (concordance/recherche)
//   public/lxx/occ/<oid>.json        occurrences par lemme (cap 500)
// Run: node scripts/build-lxx.mjs   (requiert data-sources/lxx-rahlfs, cf. LXX_SRC)
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { grecToErasmien, grecToRestituee } from "./translit.mjs";
import { decodeMorphCcat } from "./morph.mjs";
import { BOOKS, resolveBook } from "./lib/lxx-books.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = process.env.LXX_SRC || resolve(root, "data-sources/lxx-rahlfs");
const outDir = resolve(root, "public/lxx");
const OCC_CAP = 500;

const F_TEXT = "01_wordlist_unicode/text_accented.csv";
const F_LEX = "02_lexemes/OSSP_lexemes.csv";
const F_MORPH = "03a_morphology_with_JTauber_patches/patched_623693.csv";
const F_VERSE = "01_wordlist_unicode/alignment_with_OSSP/E-verse.csv";

const NATURE = {
  "N-": "Nom", "V-": "Verbe", "A-": "Adjectif", "D-": "Adverbe", "C-": "Conjonction",
  "P-": "Préposition", "X-": "Particule", "I-": "Interjection", RA: "Article",
  RD: "Pronom démonstratif", RI: "Pronom indéfini", RP: "Pronom personnel",
  RR: "Pronom relatif", RX: "Pronom relatif", M: "Numéral",
};
const natureOf = (pos) => NATURE[pos] ?? NATURE[pos[0] + "-"] ?? "Autre";

const lastField = (line) => line.slice(line.lastIndexOf("\t") + 1);
const readCol = (rel) => readFileSync(resolve(SRC, rel), "utf8").split("\n").filter(Boolean).map(lastField);

// Étiquette E-verse « Gen 1:1 », « Obad 21 » (mono-chapitre), « Sir Prolog:1 ».
function parseLabel(label) {
  const sp = label.indexOf(" ");
  const code = sp === -1 ? label : label.slice(0, sp);
  const rest = sp === -1 ? "" : label.slice(sp + 1).trim();
  const colon = rest.indexOf(":");
  const chStr = colon === -1 ? null : rest.slice(0, colon);
  const vsStr = colon === -1 ? rest : rest.slice(colon + 1);
  const chapter = chStr === null ? 1 : /^\d+$/.test(chStr) ? Number(chStr) : 0; // Prolog -> 0
  const verse = parseInt(vsStr, 10);
  return { code, chapter, verse: Number.isNaN(verse) ? 1 : verse };
}

console.log("Lecture des CSV alignés…");
// NFC : le dépôt accentue à l'oxia (U+1F79…) ; NFC ramène à la forme tonos
// (U+03CC…) du NT — concordance, gloses Bailly et recoupement inter-corpus.
const grecs = readCol(F_TEXT).map((s) => s.normalize("NFC"));
const lemmes = readCol(F_LEX).map((s) => s.normalize("NFC"));
const morphs = readCol(F_MORPH);
const N = grecs.length;
if (lemmes.length !== N || morphs.length !== N) {
  throw new Error(`Désalignement : text=${N} lex=${lemmes.length} morph=${morphs.length}`);
}

// E-verse : index de début -> {code, chapter, verse}. On affecte chaque mot au
// verset dont l'intervalle [start_k, start_{k+1}) le contient.
const everseLines = readFileSync(resolve(SRC, F_VERSE), "utf8").split("\n").filter(Boolean);
const everse = everseLines.map((line) => {
  const cols = line.split("\t");
  const start = Number(cols[0]);
  const label = lastField(line).replace(/[「」]/g, "");
  return { start, ...parseLabel(label) };
});
const meta = new Array(N + 1); // 1-based, comme les index du dépôt
for (let k = 0; k < everse.length; k++) {
  const end = k + 1 < everse.length ? everse[k + 1].start - 1 : N;
  for (let i = everse[k].start; i <= end; i++) meta[i] = everse[k];
}

rmSync(resolve(outDir, "occ"), { recursive: true, force: true });
rmSync(resolve(outDir, "books.json"), { force: true });
rmSync(resolve(outDir, "lemmas.json"), { force: true });
if (existsSync(outDir)) {
  for (const b of readdirSync(outDir)) {
    const bdir = resolve(outDir, b);
    if (!statSync(bdir).isDirectory()) continue;
    for (const f of readdirSync(bdir)) if (/^\d+\.json$/.test(f)) rmSync(resolve(bdir, f), { force: true });
  }
}
mkdirSync(outDir, { recursive: true });

const lemmaMap = new Map(); // lemme -> { nature, count, occ }
const byBook = new Map(); // book.id -> Map<chapter, mots[]>
const skipped = new Map(); // code source non retenu -> nb de mots
let mapped = 0, nullMorph = 0, autre = 0;

for (let i = 1; i <= N; i++) {
  const m = meta[i];
  if (!m) continue;
  const res = resolveBook(m.code, m.chapter);
  if (!res) {
    skipped.set(m.code, (skipped.get(m.code) ?? 0) + 1);
    continue;
  }
  const { book, chapter } = res;
  const grec = grecs[i - 1].replace(/[⸀-ⸯ]/g, "");
  const lemme = lemmes[i - 1];
  const [pos, parse] = morphs[i - 1].split(".");
  const nature = natureOf(pos);
  const morph = decodeMorphCcat(pos, parse);
  if (nature === "Autre") autre++;
  if (!morph && pos !== "C" && pos !== "P" && pos !== "X" && pos !== "I" && pos !== "D") nullMorph++;

  if (!byBook.has(book.id)) byBook.set(book.id, new Map());
  const chapters = byBook.get(book.id);
  if (!chapters.has(chapter)) chapters.set(chapter, []);
  const arr = chapters.get(chapter);
  const w = arr.length * 2;
  arr.push({ grec, erasmien: grecToErasmien(grec), restituee: grecToRestituee(grec), verse: m.verse, lemme, nature, ...(morph ? { morph } : {}) });
  mapped++;

  let e = lemmaMap.get(lemme);
  if (!e) { e = { nature, count: 0, occ: [] }; lemmaMap.set(lemme, e); }
  e.count++;
  if (e.occ.length < OCC_CAP) e.occ.push({ b: book.id, c: chapter, v: m.verse, w, f: grec });
}

const manifest = [];
for (const book of BOOKS) {
  const chapters = byBook.get(book.id);
  if (!chapters) continue; // livre absent des données (ne devrait pas arriver)
  mkdirSync(resolve(outDir, book.id), { recursive: true });
  const nums = [...chapters.keys()].sort((a, b) => a - b);
  let words = 0;
  for (const ch of nums) {
    const mots = chapters.get(ch);
    words += mots.length;
    const reference = ch === 0 ? `${book.name}, prologue` : `${book.name} ${ch}`;
    writeFileSync(resolve(outDir, book.id, `${ch}.json`), JSON.stringify({ reference, mots }));
  }
  manifest.push({ id: book.id, name: book.name, usfm: book.usfm, chapters: nums.length, words, canon: book.canon, chapterList: nums });
  process.stdout.write(`${book.id}(${nums.length}) `);
}

writeFileSync(resolve(outDir, "books.json"), JSON.stringify({ books: manifest }, null, 2));

mkdirSync(resolve(outDir, "occ"), { recursive: true });
const sorted = [...lemmaMap.entries()].sort((a, b) => a[0].localeCompare(b[0], "el"));
const lemmaIndex = sorted.map(([lemma, v], oid) => {
  writeFileSync(resolve(outDir, "occ", `${oid}.json`), JSON.stringify(v.occ));
  return { lemma, nature: v.nature, count: v.count, translit: grecToErasmien(lemma).toLowerCase(), translitR: grecToRestituee(lemma).toLowerCase(), oid };
});
writeFileSync(resolve(outDir, "lemmas.json"), JSON.stringify(lemmaIndex));

const skipTotal = [...skipped.values()].reduce((a, b) => a + b, 0);
console.log(`\n\n${manifest.length} livres, ${mapped} mots, ${lemmaIndex.length} lemmes distincts.`);
console.log(`Couverture morpho : ${nullMorph} mots fléchis sans analyse, ${autre} POS « Autre ».`);
console.log(`Ignorés (recensions non retenues) : ${skipTotal} mots — ${[...skipped.entries()].map(([c, n]) => `${c}:${n}`).join(", ")}`);
