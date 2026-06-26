// Collocations : pour chaque lemme, ses voisins qui cooccurrent dans le MÊME
// verset plus souvent que le hasard ne le voudrait (PMI), pas la cooccurrence
// brute (sinon καί/ὁ/αὐτός sortent partout). Fenêtre = verset (unité naturelle).
// Source : les chapitres déjà générés dans public/nt/<id>/<ch>.json.
// Sortie : public/nt/colloc/<oid>.json  [{ oid, lemma, score, n }]  (top voisins)
// Run: node scripts/build-nt-collocations.mjs
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ntDir = resolve(root, "public/nt");

const TOP = 12; // voisins gardés par lemme
const MIN_COOC = 3; // au moins 3 versets en commun (évite le bruit des hapax)

const books = JSON.parse(readFileSync(resolve(ntDir, "books.json"), "utf8")).books;
const lemmas = JSON.parse(readFileSync(resolve(ntDir, "lemmas.json"), "utf8"));
const oidByLemma = new Map(lemmas.map((l) => [l.lemma, l.oid]));

// Verset -> ensemble de lemmes (cooccurrence de type « document »).
const df = new Map(); // lemma -> nb de versets le contenant
const cooc = new Map(); // "a|b" (a<b par oid) -> nb de versets contenant les deux
let N = 0; // nombre total de versets

const pairKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

for (const b of books) {
  for (let ch = 1; ch <= b.chapters; ch++) {
    const data = JSON.parse(readFileSync(resolve(ntDir, b.id, `${ch}.json`), "utf8"));
    const byVerse = new Map();
    for (const m of data.mots) {
      const oid = oidByLemma.get(m.lemme);
      if (oid == null) continue;
      if (!byVerse.has(m.verse)) byVerse.set(m.verse, new Set());
      byVerse.get(m.verse).add(oid);
    }
    for (const set of byVerse.values()) {
      N++;
      const ids = [...set];
      for (const id of ids) df.set(id, (df.get(id) ?? 0) + 1);
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const k = pairKey(ids[i], ids[j]);
          cooc.set(k, (cooc.get(k) ?? 0) + 1);
        }
      }
    }
  }
}

// Voisins par lemme, classés par PMI.
const metaByOid = new Map(lemmas.map((l) => [l.oid, { lemma: l.lemma, translitR: l.translitR }]));
const neighbors = new Map(); // oid -> [{ oid, lemma, translitR, score, n }]
const push = (a, b, n, score) => {
  if (!neighbors.has(a)) neighbors.set(a, []);
  const m = metaByOid.get(b);
  neighbors.get(a).push({ oid: b, lemma: m.lemma, translitR: m.translitR, score, n });
};

for (const [key, n] of cooc) {
  if (n < MIN_COOC) continue;
  const [a, b] = key.split("|").map(Number);
  // PMI = log( P(a,b) / (P(a) P(b)) ) = log( n*N / (df[a]*df[b]) )
  const pmi = Math.log((n * N) / (df.get(a) * df.get(b)));
  if (pmi <= 0) continue; // on ne garde que les associations positives
  const score = +pmi.toFixed(3);
  push(a, b, n, score);
  push(b, a, n, score);
}

const outDir = resolve(ntDir, "colloc");
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
let written = 0;
for (const [oid, list] of neighbors) {
  list.sort((x, y) => y.score - x.score || y.n - x.n);
  writeFileSync(resolve(outDir, `${oid}.json`), JSON.stringify(list.slice(0, TOP)));
  written++;
}

console.log(`${N} versets, ${cooc.size} paires, ${written} lemmes avec voisins.`);
const agapeOid = oidByLemma.get("ἀγάπη");
console.log(
  `ἀγάπη → ${(neighbors.get(agapeOid) ?? [])
    .sort((x, y) => y.score - x.score)
    .slice(0, 10)
    .map((v) => `${v.lemma}(${v.n}, ${v.score})`)
    .join(", ")}`,
);
