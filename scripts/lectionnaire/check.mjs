import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("../..", import.meta.url).pathname);
const dataDir = path.join(root, "data/lectionnaire");
const KINDS = new Set(["lecture", "psaume", "cantique", "epitre", "apotre", "evangile"]);
const COLORS = new Set(["vert", "violet", "blanc", "rouge", "rose", "noir", "or"]);
const verseCache = new Map();

function versesOf(corpus, book, chapter) {
  const key = `${corpus}/${book}/${chapter}`;
  if (!verseCache.has(key)) {
    const file = path.join(root, "public", corpus, book, `${chapter}.json`);
    verseCache.set(key, existsSync(file) ? new Set(JSON.parse(readFileSync(file, "utf8")).mots.map((m) => m.verse)) : null);
  }
  return verseCache.get(key);
}

function checkPassage(p) {
  if (p.absent) return null;
  const verses = versesOf(p.corpus, p.book, p.chapter);
  if (!verses) return `chapitre introuvable ${p.corpus}/${p.book}/${p.chapter}`;
  if (!(p.from <= p.to)) return `plage invalide ${p.from}-${p.to}`;
  for (const v of [p.from, p.to]) if (!verses.has(v)) return `verset ${v} absent de ${p.corpus}/${p.book}/${p.chapter}`;
  return null;
}

const rites = process.argv[2] ? [process.argv[2]] : existsSync(dataDir) ? readdirSync(dataDir) : [];
let errors = 0;
let days = 0;
for (const rite of rites) {
  for (const file of readdirSync(path.join(dataDir, rite)).filter((f) => f.endsWith(".json"))) {
    const data = JSON.parse(readFileSync(path.join(dataDir, rite, file), "utf8"));
    for (const [date, day] of Object.entries(data.days)) {
      days++;
      const fail = (msg) => {
        errors++;
        if (errors <= 200) console.log(`${rite} ${date} : ${msg}`);
      };
      if (!day.title) fail("titre manquant");
      if (day.color && !COLORS.has(day.color)) fail(`couleur inconnue ${day.color}`);
      for (const mass of day.masses ?? []) {
        for (const r of mass.readings ?? []) {
          if (!KINDS.has(r.kind)) fail(`kind inconnu ${r.kind}`);
          if (!r.label || !r.ref) fail(`label ou ref manquant (${r.ref ?? "?"})`);
          if (!r.passages?.length) fail(`${r.ref} : aucun passage`);
          for (const p of r.passages ?? []) {
            const msg = checkPassage(p);
            if (msg) fail(`${r.ref} : ${msg}`);
          }
        }
      }
    }
  }
}
console.log(`${days} jours, ${errors} erreur(s)`);
process.exit(errors ? 1 : 0);
