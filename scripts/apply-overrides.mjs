// Rejoue les décisions d'arbitrage de Biblion (data/lxx-arbitration.json) sur les
// fr.json servis. Lancé à CHAQUE build : un build n'efface jamais son jugement.
// Ne touche jamais au texte Giguet ; matérialise le lien (concat des versets Giguet
// immuables). ARB_DIR (préprod) = emplacement persistant des overrides.
//
//   node scripts/apply-overrides.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ARB_DIR = process.env.ARB_DIR || path.join(repo, "data");
const LXX = process.env.LXX_DATA_DIR || path.join(repo, "public/lxx");

const giguet = JSON.parse(fs.readFileSync(path.join(repo, "data/giguet-lxx.json"), "utf8"));
const ovPath = path.join(ARB_DIR, "lxx-arbitration.json");
const overrides = fs.existsSync(ovPath) ? JSON.parse(fs.readFileSync(ovPath, "utf8")) : {};

const gt = (b, c, v) => giguet[b]?.[String(c)]?.[String(v)] ?? null;
let applied = 0;
for (const book of Object.keys(overrides)) {
  const frPath = path.join(LXX, book, "fr.json");
  if (!fs.existsSync(frPath)) continue;
  const fr = JSON.parse(fs.readFileSync(frPath, "utf8"));
  for (const ref of Object.keys(overrides[book])) {
    const [ch, v] = ref.split(":");
    const sources = overrides[book][ref].sources || [];
    fr[ch] = fr[ch] || {};
    const text = sources.map((s) => gt(book, s[0], s[1])).filter(Boolean).join(" ").trim();
    if (text) fr[ch][v] = text;
    else delete fr[ch][v]; // orphelin-grec
    applied++;
  }
  const tmp = frPath + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(fr));
  fs.renameSync(tmp, frPath);
}
console.log(`Overrides Biblion rejoués : ${applied} versets (source ${ovPath}).`);
