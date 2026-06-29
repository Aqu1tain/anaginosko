// Profil de distribution des lemmes : pour chaque lemme, son comptage par livre
// (non tronqué, contrairement aux occ/*.json plafonnées), + le nombre total de
// mots par livre (pour le mode densité). Source : les chapitres déjà générés
// dans public/nt/<id>/<ch>.json (pas besoin de MorphGNT).
// Sortie :
//   public/nt/distribution/<oid>.json   { <bookId>: count }
//   public/nt/books.json        manifeste enrichi d'un champ `words` par livre
// Run: node scripts/build-nt-distribution.mjs
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ntDir = resolve(root, process.env.CORPUS_DIR || "public/nt");

const books = JSON.parse(readFileSync(resolve(ntDir, "books.json"), "utf8")).books;
const lemmas = JSON.parse(readFileSync(resolve(ntDir, "lemmas.json"), "utf8"));
const oidByLemma = new Map(lemmas.map((l) => [l.lemma, l.oid]));

const distByOid = new Map(); // oid -> { bookId: count }
const bookWords = {}; // bookId -> nombre total de mots

for (const b of books) {
  bookWords[b.id] = 0;
  const files = readdirSync(resolve(ntDir, b.id)).filter((f) => /^\d+\.json$/.test(f));
  for (const f of files) {
    const data = JSON.parse(readFileSync(resolve(ntDir, b.id, f), "utf8"));
    for (const m of data.mots) {
      bookWords[b.id]++;
      const oid = oidByLemma.get(m.lemme);
      if (oid == null) continue;
      let d = distByOid.get(oid);
      if (!d) {
        d = {};
        distByOid.set(oid, d);
      }
      d[b.id] = (d[b.id] || 0) + 1;
    }
  }
}

const distDir = resolve(ntDir, "distribution");
rmSync(distDir, { recursive: true, force: true });
mkdirSync(distDir, { recursive: true });
for (const [oid, d] of distByOid) {
  writeFileSync(resolve(distDir, `${oid}.json`), JSON.stringify(d));
}

writeFileSync(
  resolve(ntDir, "books.json"),
  JSON.stringify({ books: books.map((b) => ({ ...b, words: bookWords[b.id] })) }, null, 2),
);

const grandTotal = Object.values(bookWords).reduce((a, c) => a + c, 0);
console.log(`${distByOid.size} profils, ${grandTotal} mots au total.`);
if (!process.env.CORPUS_DIR) {
  const agapeOid = oidByLemma.get("ἀγάπη");
  const agape = distByOid.get(agapeOid);
  const agapeSum = Object.values(agape).reduce((a, c) => a + c, 0);
  console.log(`ἀγάπη (oid ${agapeOid}) → ${JSON.stringify(agape)}  somme=${agapeSum} (count attendu 116)`);
}
