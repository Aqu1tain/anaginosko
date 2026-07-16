// Gate de post-déploiement : vérifie que chaque verset sentinelle est SERVI avec sa
// sous-chaîne attendue après matérialisation. Aurait attrapé la désync ARB_DIR/git
// du 2026-07-08 (déploiement vert mais 1ki 5:1 servait encore « Hiram »).
// Lit le fr.json SERVI (LXX_DATA_DIR au déploiement, sinon public/lxx).
//
//   LXX_DATA_DIR=/var/www/... node scripts/check-sentinelles.mjs   (exit 1 si une sentinelle KO)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LXX = process.env.LXX_DATA_DIR || path.join(repo, "public/lxx");
const { sentinelles } = JSON.parse(fs.readFileSync(path.join(repo, "data/lxx-sentinelles.json"), "utf8"));

let ko = 0;
for (const s of sentinelles) {
  const [ch, v] = s.ref.split(":");
  const p = path.join(LXX, s.book, "fr.json");
  const served = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8"))?.[ch]?.[v] : null;
  const ok = served != null && served.includes(s.expect);
  console.log(`  ${ok ? "OK " : "KO "} ${s.book} ${s.ref} attend « ${s.expect} » ${ok ? "" : `-> servi: ${served == null ? "(absent)" : JSON.stringify(served.slice(0, 60))}`}`);
  if (!ok) ko++;
}
console.log(`\nsentinelles : ${sentinelles.length - ko}/${sentinelles.length} OK`);
if (ko) { console.error(`GATE: ${ko} sentinelle(s) non servie(s) comme attendu. Déploiement à rejeter.`); process.exit(1); }
