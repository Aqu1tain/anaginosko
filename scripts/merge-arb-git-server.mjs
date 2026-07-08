// Option 2 — fusion durable git <-> ARB_DIR serveur, exécutée au déploiement.
// Modèle : git est la SOURCE DE VÉRITÉ de l'arbitrage ; l'ARB_DIR serveur est la
// copie de travail où Biblion ajoute en direct. Trois règles, aucune résolution
// silencieuse par priorité :
//   1. entrée git-active absente du serveur           -> INSTALLÉE
//   2. entrée serveur absente de git-active :
//        - présente dans git._archived                -> RETIRÉE (git l'a archivée exprès)
//        - sinon (travail frais de Biblion)           -> CONSERVÉE + capturée (--capture)
//   3. ref présente des deux côtés, sources DIFFÉRENTES -> CONFLIT BLOQUANT (refs nommées, exit 1)
// --block-fresh : traite aussi le travail frais non versionné comme bloquant (usage PROD :
//   force à capturer dans git avant de déployer).
//
//   node scripts/merge-arb-git-server.mjs --git <git.json> --server <server.json> \
//        --out <merged.json> --capture <fresh.json> [--block-fresh]

import fs from "node:fs";

const arg = (name) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : null; };
const GIT = arg("--git"), SERVER = arg("--server"), OUT = arg("--out"), CAPTURE = arg("--capture");
const BLOCK_FRESH = process.argv.includes("--block-fresh");
if (!GIT || !SERVER || !OUT) { console.error("usage: --git <f> --server <f> --out <f> [--capture <f>] [--block-fresh]"); process.exit(2); }

const git = JSON.parse(fs.readFileSync(GIT, "utf8"));
const server = JSON.parse(fs.readFileSync(SERVER, "utf8"));
const isBook = (k) => !k.startsWith("_");
const srcOf = (e) => JSON.stringify((e && e.sources) || e);

// git-active + git-archivé
const gitActive = new Map(); // "book ref" -> entry
for (const b of Object.keys(git).filter(isBook)) for (const r of Object.keys(git[b])) gitActive.set(`${b}:::${r}`, { book: b, ref: r, entry: git[b][r] });
const archived = new Set();
const arch = git._archived || {};
for (const b of Object.keys(arch)) { if (b.startsWith("_") || b === "archivedAt") continue; for (const r of Object.keys(arch[b])) archived.add(`${b}:::${r}`); }

// merged commence par git-active (source de vérité), en préservant les métas git.
const merged = {};
for (const k of Object.keys(git)) if (!isBook(k)) merged[k] = git[k];
for (const [, { book, ref, entry }] of gitActive) { (merged[book] = merged[book] || {})[ref] = entry; }

const conflicts = [], fresh = [], removed = [], installed = [];
for (const [, { book, ref }] of gitActive) if (!(server[book] && server[book][ref])) installed.push(`${book} ${ref}`);

for (const b of Object.keys(server).filter(isBook)) {
  for (const r of Object.keys(server[b])) {
    const key = `${b}:::${r}`;
    if (gitActive.has(key)) {
      if (srcOf(gitActive.get(key).entry) !== srcOf(server[b][r])) conflicts.push({ book: b, ref: r, git: gitActive.get(key).entry.sources, serveur: server[b][r].sources });
      continue; // identique : déjà posé par git
    }
    if (archived.has(key)) { removed.push(`${b} ${r}`); continue; } // git l'a archivée
    // travail frais de Biblion : conservé + capturé
    (merged[b] = merged[b] || {})[r] = server[b][r];
    fresh.push({ book: b, ref: r, sources: server[b][r].sources });
  }
}

console.log(`fusion arbitrage : installées ${installed.length} · retirées(archivées) ${removed.length} · fraîches Biblion ${fresh.length} · conflits ${conflicts.length}`);
if (removed.length) console.log(`  retirées: ${removed.join(", ")}`);
if (fresh.length) console.log(`  fraîches (conservées${CAPTURE ? ", capturées" : ""}): ${fresh.map((f) => f.book + " " + f.ref).join(", ")}`);

if (conflicts.length) {
  console.error(`\nCONFLIT BLOQUANT : ${conflicts.length} refs présentes des deux côtés avec des sources différentes. Aucune résolution silencieuse.`);
  for (const c of conflicts) console.error(`  ${c.book} ${c.ref} : git=${JSON.stringify(c.git)} serveur=${JSON.stringify(c.serveur)}`);
  console.error("Résous en refs nommées (git ou serveur) puis redéploie.");
  process.exit(1);
}
if (CAPTURE && fresh.length) fs.writeFileSync(CAPTURE, JSON.stringify(fresh, null, 1));
if (fresh.length && BLOCK_FRESH) { console.error(`\nBLOQUANT (--block-fresh) : ${fresh.length} entrées Biblion non versionnées dans git. Capture-les dans git (${CAPTURE || "voir --capture"}) avant de déployer en prod.`); process.exit(1); }

const tmp = OUT + ".tmp";
fs.writeFileSync(tmp, JSON.stringify(merged, null, 1));
fs.renameSync(tmp, OUT);
console.log(`merged -> ${OUT}`);
