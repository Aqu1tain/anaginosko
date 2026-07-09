// Intègre biblion-fresh.json (capture des entrées Biblion non versionnées, remontée en
// artefact par le déploiement) dans data/lxx-arbitration.json, pour versionner son travail
// dans git — l'étape « à committer dans git ensuite » du déploiement, enfin outillée.
//
// La capture porte l'entrée COMPLÈTE (sources + maison + by + at). On REFUSE une capture
// au format hérité (sources seules, sans maison) : la commiter perdrait les traductions.
// Idempotent : réintégrer la même capture ne change rien. Écriture atomique.
//
//   node scripts/integrate-biblion-fresh.mjs <biblion-fresh.json> [data/lxx-arbitration.json]
//   node scripts/integrate-biblion-fresh.mjs <biblion-fresh.json> --dry   (montre sans écrire)

import fs from "node:fs";

const [, , FRESH, ...rest] = process.argv;
const DRY = rest.includes("--dry");
const OUT = rest.find((a) => !a.startsWith("--")) || "data/lxx-arbitration.json";
if (!FRESH) { console.error("usage: node scripts/integrate-biblion-fresh.mjs <biblion-fresh.json> [arbitration.json] [--dry]"); process.exit(2); }

const fresh = JSON.parse(fs.readFileSync(FRESH, "utf8"));
if (!Array.isArray(fresh)) { console.error("Format inattendu : biblion-fresh.json doit être un tableau."); process.exit(1); }

// Garde-fou : une capture au format hérité (sans `entry`) amputerait les maison.
const legacy = fresh.filter((f) => f && f.entry === undefined && f.sources !== undefined);
if (legacy.length) {
  console.error(`REFUS : ${legacy.length}/${fresh.length} entrées sont au format hérité (sources seules, sans maison).`);
  console.error("Redéploie d'abord pour régénérer biblion-fresh.json au format complet (entrée entière), puis relance.");
  process.exit(1);
}

const arb = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};
let added = 0, updated = 0, unchanged = 0;
for (const f of fresh) {
  if (!f || !f.book || !f.ref || !f.entry) continue;
  arb[f.book] = arb[f.book] || {};
  const before = arb[f.book][f.ref] ? JSON.stringify(arb[f.book][f.ref]) : null;
  const after = JSON.stringify(f.entry);
  if (before === after) { unchanged++; continue; }
  arb[f.book][f.ref] = f.entry;
  if (before) updated++; else added++;
}

console.log(`intégration : ${added} ajoutées · ${updated} mises à jour · ${unchanged} inchangées (sur ${fresh.length})`);
if (DRY) { console.log("(--dry : rien écrit)"); process.exit(0); }
if (added || updated) {
  const tmp = OUT + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(arb, null, 2));
  fs.renameSync(tmp, OUT);
  console.log(`écrit -> ${OUT}`);
} else {
  console.log("rien à écrire (déjà à jour).");
}
