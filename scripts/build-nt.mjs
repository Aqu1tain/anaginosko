// Ingestion du NT complet (MorphGNT) -> données statiques chargées à la demande.
// Sortie :
//   public/nt/books.json            manifeste { books:[{id,name,usfm,chapters}] }
//   public/nt/<id>/<chapter>.json   { reference, mots:[{grec,erasmien,restituee,verse,lemme,nature}] }
//   public/nt/lemmas.json           index { lemma:{nature,count} } (concordance/recherche)
// Run: node scripts/build-nt.mjs   (requiert /tmp/morphgnt rempli)
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { grecToErasmien, grecToRestituee } from "./translit.mjs";
import { decodeMorph } from "./morph.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MORPH = process.env.MORPH_DIR || "/tmp/morphgnt";
const outDir = resolve(root, "public/nt");
const OCC_CAP = 500; // occurrences stockées par lemme (les mots ultra-fréquents sont tronqués)

// id, nom FR, fichier MorphGNT, code USFM (helloao/Crampon).
const BOOKS = [
  ["mt", "Matthieu", "61-Mt", "MAT"], ["mk", "Marc", "62-Mk", "MRK"],
  ["lk", "Luc", "63-Lk", "LUK"], ["jn", "Jean", "64-Jn", "JHN"],
  ["ac", "Actes", "65-Ac", "ACT"], ["ro", "Romains", "66-Ro", "ROM"],
  ["1co", "1 Corinthiens", "67-1Co", "1CO"], ["2co", "2 Corinthiens", "68-2Co", "2CO"],
  ["ga", "Galates", "69-Ga", "GAL"], ["eph", "Éphésiens", "70-Eph", "EPH"],
  ["php", "Philippiens", "71-Php", "PHP"], ["col", "Colossiens", "72-Col", "COL"],
  ["1th", "1 Thessaloniciens", "73-1Th", "1TH"], ["2th", "2 Thessaloniciens", "74-2Th", "2TH"],
  ["1ti", "1 Timothée", "75-1Ti", "1TI"], ["2ti", "2 Timothée", "76-2Ti", "2TI"],
  ["tit", "Tite", "77-Tit", "TIT"], ["phm", "Philémon", "78-Phm", "PHM"],
  ["heb", "Hébreux", "79-Heb", "HEB"], ["jas", "Jacques", "80-Jas", "JAS"],
  ["1pe", "1 Pierre", "81-1Pe", "1PE"], ["2pe", "2 Pierre", "82-2Pe", "2PE"],
  ["1jn", "1 Jean", "83-1Jn", "1JN"], ["2jn", "2 Jean", "84-2Jn", "2JN"],
  ["3jn", "3 Jean", "85-3Jn", "3JN"], ["jud", "Jude", "86-Jud", "JUD"],
  ["re", "Apocalypse", "87-Re", "REV"],
];

const NATURE = {
  "N-": "Nom", "V-": "Verbe", "A-": "Adjectif", "D-": "Adverbe", "C-": "Conjonction",
  "P-": "Préposition", "X-": "Particule", "I-": "Interjection", RA: "Article",
  RD: "Pronom démonstratif", RI: "Pronom indéfini", RP: "Pronom personnel", RR: "Pronom relatif",
};
const natureOf = (pos) => NATURE[pos] ?? NATURE[pos[0] + "-"] ?? "Autre";

// Nettoie nos sorties générées, mais PRÉSERVE les fr.json (récupérés séparément).
rmSync(resolve(outDir, "occ"), { recursive: true, force: true });
rmSync(resolve(outDir, "books.json"), { force: true });
rmSync(resolve(outDir, "lemmas.json"), { force: true });
if (existsSync(outDir)) {
  for (const b of readdirSync(outDir)) {
    const bdir = resolve(outDir, b);
    if (!statSync(bdir).isDirectory()) continue;
    for (const f of readdirSync(bdir)) {
      if (/^\d+\.json$/.test(f)) rmSync(resolve(bdir, f), { force: true });
    }
  }
}
mkdirSync(outDir, { recursive: true });

const lemmas = new Map(); // lemme -> { nature, count }
const manifest = [];
let totalWords = 0;

for (const [id, name, file, usfm] of BOOKS) {
  const lines = readFileSync(resolve(MORPH, `${file}.txt`), "utf8").split("\n").filter(Boolean);
  // chapitre -> [{grec,erasmien,restituee,verse,lemme,nature}]
  const chapters = new Map();
  for (const line of lines) {
    const p = line.split(" ");
    const ref = p[0]; // BBCCVV
    const ch = Number(ref.slice(2, 4));
    const verse = Number(ref.slice(4, 6));
    // forme avec ponctuation ; on retire les sigles d'apparat critique (⸀⸂⸃…).
    const grec = p[3].replace(/[⸀-ⸯ]/g, "");
    const lemme = p[6];
    const nature = natureOf(p[1]);
    const morph = decodeMorph(p[2]);
    if (!chapters.has(ch)) chapters.set(ch, []);
    const arr = chapters.get(ch);
    const w = arr.length * 2; // tokenizeText intercale un espace : mot n -> jeton 2n
    arr.push({
      grec,
      erasmien: grecToErasmien(grec),
      restituee: grecToRestituee(grec),
      verse,
      lemme,
      nature,
      ...(morph ? { morph } : {}),
    });
    totalWords++;
    let e = lemmas.get(lemme);
    if (!e) {
      e = { nature, count: 0, occ: [] };
      lemmas.set(lemme, e);
    }
    e.count++;
    if (e.occ.length < OCC_CAP) e.occ.push({ b: id, c: ch, v: verse, w, f: grec });
  }

  mkdirSync(resolve(outDir, id), { recursive: true });
  const chapterNums = [...chapters.keys()].sort((a, b) => a - b);
  for (const ch of chapterNums) {
    writeFileSync(
      resolve(outDir, id, `${ch}.json`),
      JSON.stringify({ reference: `${name} ${ch}`, mots: chapters.get(ch) }),
    );
  }
  manifest.push({ id, name, usfm, chapters: chapterNums.length });
  process.stdout.write(`${id}(${chapterNums.length}) `);
}

writeFileSync(resolve(outDir, "books.json"), JSON.stringify({ books: manifest }, null, 2));

// Index des lemmes (trié grec) + occurrences par lemme (fichier dédié, à la demande).
mkdirSync(resolve(outDir, "occ"), { recursive: true });
const sorted = [...lemmas.entries()].sort((a, b) => a[0].localeCompare(b[0], "el"));
const lemmaIndex = sorted.map(([lemma, v], oid) => {
  writeFileSync(resolve(outDir, "occ", `${oid}.json`), JSON.stringify(v.occ));
  return {
    lemma,
    nature: v.nature,
    count: v.count,
    translit: grecToErasmien(lemma).toLowerCase(),
    translitR: grecToRestituee(lemma).toLowerCase(),
    oid,
  };
});
writeFileSync(resolve(outDir, "lemmas.json"), JSON.stringify(lemmaIndex));

console.log(`\n\n${manifest.length} livres, ${totalWords} mots, ${lemmaIndex.length} lemmes distincts.`);
