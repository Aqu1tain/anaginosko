// Ramène dans data/ le travail de traduction de la prod, téléchargé dans <dossier> par
// la sauvegarde quotidienne. Sans cette capture, ce travail n'existe que sur le VPS.
//  - lxx-arbitration.json : union, la prod l'emporte verset par verset ; une entrée
//    connue seulement de git est gardée, une entrée archivée par git n'est pas réinstallée.
//  - lxx-biblion-validated.json et nt-maison.json : copie exacte de la prod.
//   node scripts/capture-prod-arbitration.mjs <dossier>
import fs from "node:fs";
import path from "node:path";

const [, , SRC] = process.argv;
if (!SRC) { console.error("usage: node scripts/capture-prod-arbitration.mjs <dossier>"); process.exit(2); }
const DATA = process.env.CAPTURE_DATA_DIR || "data";
const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const write = (name, value) => fs.writeFileSync(path.join(DATA, name), JSON.stringify(value, null, 2));
const source = (name) => { const file = path.join(SRC, name); return fs.existsSync(file) ? read(file) : null; };

const prodArb = source("lxx-arbitration.json");
if (prodArb) {
  const git = read(path.join(DATA, "lxx-arbitration.json"));
  const archived = git._archived || {};
  let added = 0, updated = 0;
  for (const [book, entries] of Object.entries(prodArb)) {
    if (book.startsWith("_") || !entries || typeof entries !== "object") continue;
    for (const [ref, entry] of Object.entries(entries)) {
      if (archived[book]?.[ref]) continue;
      const before = git[book]?.[ref];
      if (JSON.stringify(before) === JSON.stringify(entry)) continue;
      (git[book] ??= {})[ref] = entry;
      if (before) updated++;
      else added++;
    }
  }
  write("lxx-arbitration.json", git);
  console.log(`arbitrage LXX : ${added} ajoutées, ${updated} mises à jour`);
}

for (const name of ["lxx-biblion-validated.json", "nt-maison.json"]) {
  const value = source(name);
  if (value === null) continue;
  write(name, name === "nt-maison.json" ? value.translations ?? value : value);
  console.log(`${name} : copie de la prod`);
}
