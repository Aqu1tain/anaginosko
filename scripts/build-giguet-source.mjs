// Construit la source Giguet IMMUABLE : le texte français dans la numérotation
// D'ORIGINE de Giguet (avant tout réalignement), notes de bas de page nettoyées.
// C'est la colonne qu'on ne modifie jamais ; les liens pointent dessus.
// Base : commit d'ingestion e442251a (+ sus/bel ajoutés plus tard) ; le marqueur
// « ↑ » (note Wikisource) est tronqué comme dans clean-lxx-footnotes.
//
//   node scripts/build-giguet-source.mjs   -> data/giguet-lxx.json

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INGEST = "e442251a"; // ingestion Giguet d'origine (numérotation Giguet)
// Livres re-parsés avec le parser corrigé (chapitres monotones + prologue) : leur
// ingestion consolidée vit dans data/lxx-giguet-ingest/<id>.json (déjà nettoyée),
// ré-épinglée ici. Provenance + oldids Wikisource : data/lxx-giguet-fixes.json.
const INGEST_LOCAL = new Set(["job", "psa", "isa", "pro", "sir"]);
const MARK = "↑";

const books = JSON.parse(fs.readFileSync(path.join(repo, "public/lxx/books.json"), "utf8"));
const list = Array.isArray(books) ? books : books.books || Object.values(books);

const cleanFootnote = (t) => {
  if (!t.includes(MARK)) return t;
  return t.slice(0, t.indexOf(MARK)).trim();
};

const fromGit = (ref, rel) => {
  try {
    return JSON.parse(execSync(`git show ${ref}:${rel}`, { cwd: repo, maxBuffer: 50 * 1024 * 1024 }).toString());
  } catch {
    return null;
  }
};

const out = {};
let books_done = 0,
  verses = 0,
  dropped = 0;
for (const b of list) {
  const id = b.id;
  if (!id) continue;
  let raw;
  if (INGEST_LOCAL.has(id)) {
    const p = path.join(repo, "data/lxx-giguet-ingest", `${id}.json`);
    raw = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null;
  } else {
    // sus/bel n'existent pas à l'ingestion : on prend leur version HEAD (déjà propre).
    const ref = id === "sus" || id === "bel" ? "HEAD" : INGEST;
    raw = fromGit(ref, `public/lxx/${id}/fr.json`);
  }
  if (!raw) continue;
  const book = {};
  for (const ch of Object.keys(raw)) {
    if (ch === "_align") continue;
    const chapter = {};
    for (const v of Object.keys(raw[ch])) {
      const cleaned = cleanFootnote(String(raw[ch][v]));
      if (cleaned.length === 0) {
        dropped++;
        continue;
      }
      chapter[v] = cleaned;
      verses++;
    }
    if (Object.keys(chapter).length) book[ch] = chapter;
  }
  out[id] = book;
  books_done++;
}

const dest = path.join(repo, "data");
fs.mkdirSync(dest, { recursive: true });
fs.writeFileSync(path.join(dest, "giguet-lxx.json"), JSON.stringify(out));
console.log(`Giguet immuable : ${books_done} livres, ${verses} versets (${dropped} clés purement notes retirées) -> data/giguet-lxx.json`);
