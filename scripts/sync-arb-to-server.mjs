// Option 1 — sync ponctuel de l'ARB_DIR serveur <- arbitrage git (remédiation de la
// désynchronisation constatée le 2026-07-08 : le déploiement re-matérialise depuis
// l'ARB_DIR serveur, qui était resté au baseline 151 ; les 155 corrections Phase 2
// ne servaient pas et les 11 overrides Job périmés cassaient Job sur la donnée neuve).
//
// Verrous (exigés) :
//  - backup horodaté + checksum du fichier serveur AVANT ;
//  - précondition : le serveur est TOUJOURS à 151 identiques au baseline capturé
//    (d57fb33c) ; si Biblion a écrit entre-temps -> STOP et capture de ses ajouts ;
//  - remplacement par l'arbitrage git (HEAD), re-matérialisation serveur ;
//  - preuves : 1ki 5:1 = « les officiers », job 25:1 = « Or Baldad le Sauchite »,
//    materialize --check serveur = 0, et diff complet ancien-servi vs nouveau-servi
//    borné EXACTEMENT à la partition attendue (serveur-avant == matérialisation du
//    baseline, serveur-après == matérialisation de git == repo).
//
//   node scripts/sync-arb-to-server.mjs         (dry-run : précondition + partition, n'écrit RIEN sur le serveur)
//   node scripts/sync-arb-to-server.mjs --go    (backup, remplace, re-matérialise, prouve)

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GO = process.argv.includes("--go");
const KEY = process.env.VPS_KEY || `${os.homedir()}/Documents/Projets/anaginosko-deploy/.ssh/id_ed25519`;
const HOST = process.env.VPS_HOST || "debian@vps-70f3bda7.vps.ovh.net";
const ARB_SERVER = "/opt/anaginosko-web-next/arbitration/lxx-arbitration.json";
const LXX_SERVER = "/var/www/anaginosko-next/lxx";
const RELEASE = "/opt/anaginosko-web-next/current";
const BASELINE_REF = "d57fb33c"; // capture ARB_DIR du 2026-07-07 (151 entrées)
const SSH = `ssh -i ${KEY} -o ConnectTimeout=15 -o StrictHostKeyChecking=accept-new`;
const ssh = (cmd) => execSync(`${SSH} ${HOST} ${JSON.stringify(cmd)}`, { maxBuffer: 1e8 }).toString();
const scpUp = (local, remote) => execSync(`scp -i ${KEY} -o StrictHostKeyChecking=accept-new ${local} ${HOST}:${remote}`, { stdio: "inherit" });

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "arbsync-"));
const die = (msg) => { console.error(`\n[31mSTOP[0m ${msg}`); process.exit(1); };
const canon = (a) => { const rows = []; for (const b of Object.keys(a).filter((k) => !k.startsWith("_")).sort()) for (const r of Object.keys(a[b]).sort()) rows.push(`${b} ${r} ${JSON.stringify(a[b][r].sources)}`); return rows; };
const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");

console.log(`== sync-arb-to-server (${GO ? "GO" : "dry-run"}) ==\ntmp: ${tmp}\n`);

// 0) Arbitrage git local (295) + baseline capturé (151).
const gitArb = JSON.parse(fs.readFileSync(path.join(repo, "data/lxx-arbitration.json"), "utf8"));
const baseline = JSON.parse(execSync(`git show ${BASELINE_REF}:data/lxx-arbitration.json`, { cwd: repo }).toString());
const baseRows = canon(baseline);
console.log(`git arbitrage : ${canon(gitArb).length} entrées · baseline ${BASELINE_REF} : ${baseRows.length} entrées`);

// 1) Récupère l'ARB serveur.
console.log("\n[1] lecture ARB serveur…");
const serverArbRaw = ssh(`cat ${ARB_SERVER}`);
fs.writeFileSync(path.join(tmp, "server-arb.json"), serverArbRaw);
const serverArb = JSON.parse(serverArbRaw);
const srvRows = canon(serverArb);
console.log(`    serveur : ${srvRows.length} entrées`);

// 2) PRÉCONDITION : serveur == baseline (aucune écriture Biblion depuis la capture).
console.log("\n[2] précondition serveur == baseline…");
const shaSrv = sha(srvRows.join("\n")), shaBase = sha(baseRows.join("\n"));
console.log(`    sha canonique serveur  : ${shaSrv.slice(0, 16)}`);
console.log(`    sha canonique baseline : ${shaBase.slice(0, 16)}`);
if (shaSrv !== shaBase) {
  const baseSet = new Set(baseRows), srvSet = new Set(srvRows);
  const fresh = srvRows.filter((r) => !baseSet.has(r));
  const gone = baseRows.filter((r) => !srvSet.has(r));
  fs.writeFileSync(path.join(tmp, "biblion-fresh.txt"), `AJOUTS/MODIFS serveur absents du baseline (travail frais de Biblion) :\n${fresh.join("\n")}\n\nABSENTS du serveur vs baseline :\n${gone.join("\n")}\n`);
  die(`serveur != baseline. Biblion a écrit depuis le 2026-07-07.\n  ajouts frais: ${fresh.length}, disparus: ${gone.length}\n  -> capture d'abord ses ajouts : ${path.join(tmp, "biblion-fresh.txt")}\n  (ne PAS remplacer tant que ce travail n'est pas versionné dans git)`);
}
console.log("    OK : serveur identique au baseline, aucun travail Biblion non versionné.");

// 3) Partition ATTENDUE : matérialisation locale baseline (A) vs git (B == repo public/lxx).
console.log("\n[3] calcul de la partition attendue (matérialisation locale baseline vs git)…");
const baseArbDir = path.join(tmp, "arb-baseline"); fs.mkdirSync(baseArbDir, { recursive: true });
fs.writeFileSync(path.join(baseArbDir, "lxx-arbitration.json"), JSON.stringify(baseline));
const outA = path.join(tmp, "served-A-baseline"); fs.mkdirSync(outA, { recursive: true });
execSync(`ARB_DIR=${baseArbDir} MATERIALIZE_OUT=${outA} node scripts/materialize-links.mjs`, { cwd: repo, maxBuffer: 1e8 });
const readFr = (dir, book) => { const p = path.join(dir, book, "fr.json"); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : {}; };
const books = fs.readdirSync(path.join(repo, "public/lxx")).filter((b) => fs.existsSync(path.join(repo, "public/lxx", b, "fr.json")));
const diffVerses = (dA, getA, dB, getB) => {
  const rows = [];
  for (const b of books) {
    const a = getA(dA, b), z = getB(dB, b);
    const chs = new Set([...Object.keys(a), ...Object.keys(z)].filter((k) => k !== "_align"));
    for (const ch of chs) { const oa = a[ch] || {}, oz = z[ch] || {}; for (const v of new Set([...Object.keys(oa), ...Object.keys(oz)])) if (oa[v] !== oz[v]) rows.push({ ref: `${b} ${ch}:${v}`, a: oa[v] ?? null, z: oz[v] ?? null }); }
  }
  return rows;
};
const expected = diffVerses(outA, readFr, path.join(repo, "public/lxx"), readFr);
const expectedBooks = new Set(expected.map((r) => r.ref.split(" ")[0]));
console.log(`    partition attendue : ${expected.length} versets, livres ${[...expectedBooks].sort().join(",")}`);
fs.writeFileSync(path.join(tmp, "partition-attendue.json"), JSON.stringify(expected, null, 1));

// 4) Snapshot SERVEUR-AVANT et vérifie == matérialisation baseline (A).
console.log("\n[4] snapshot serveur-avant + vérif == baseline…");
execSync(`rsync -az -e ${JSON.stringify(SSH)} ${HOST}:${LXX_SERVER}/ ${tmp}/served-before/ --include='*/' --include='fr.json' --exclude='*'`, { stdio: "inherit" });
const beforeVsA = diffVerses(path.join(tmp, "served-before"), readFr, outA, readFr);
if (beforeVsA.length) { fs.writeFileSync(path.join(tmp, "before-vs-baseline.json"), JSON.stringify(beforeVsA, null, 1)); die(`serveur-avant != matérialisation baseline (${beforeVsA.length} écarts) -> ${path.join(tmp, "before-vs-baseline.json")}. État serveur inattendu, on n'écrit pas.`); }
console.log("    OK : serveur-avant == matérialisation baseline (point de départ prouvé).");

if (!GO) {
  console.log(`\n[dry-run] précondition OK, partition attendue = ${expected.length} versets (${path.join(tmp, "partition-attendue.json")}).`);
  console.log("Relance avec --go pour backup + remplacement + re-matérialisation + preuves.");
  process.exit(0);
}

// 5) BACKUP horodaté + checksum serveur.
const TS = ssh("date +%Y%m%d%H%M%S").trim();
console.log(`\n[5] backup serveur (TS=${TS})…`);
const shaBefore = ssh(`sha256sum ${ARB_SERVER}`).trim().split(/\s+/)[0];
ssh(`cp ${ARB_SERVER} ${ARB_SERVER}.bak.${TS}`);
fs.writeFileSync(path.join(tmp, `server-arb.bak.${TS}.json`), serverArbRaw);
console.log(`    backup: ${ARB_SERVER}.bak.${TS} · sha256=${shaBefore.slice(0, 16)} (copie locale ${tmp})`);

// 6) Remplacement atomique par l'arbitrage git.
console.log("\n[6] upload arbitrage git -> ARB serveur (atomique)…");
scpUp(path.join(repo, "data/lxx-arbitration.json"), `${ARB_SERVER}.new`);
ssh(`mv ${ARB_SERVER}.new ${ARB_SERVER}`);
const nSrv = canon(JSON.parse(ssh(`cat ${ARB_SERVER}`))).length;
console.log(`    serveur désormais : ${nSrv} entrées`);

// 7) Re-matérialisation serveur + materialize --check = 0.
console.log("\n[7] re-matérialisation serveur…");
process.stdout.write(ssh(`cd ${RELEASE} && ARB_DIR=$(dirname ${ARB_SERVER}) LXX_DATA_DIR=${LXX_SERVER} node scripts/materialize-links.mjs --apply 2>&1 | tail -2`));
const check = ssh(`cd ${RELEASE} && ARB_DIR=$(dirname ${ARB_SERVER}) LXX_DATA_DIR=${LXX_SERVER} node scripts/materialize-links.mjs --check 2>&1 | tail -1`);
console.log(`    check serveur: ${check.trim()}`);
if (!/0 versets différents/.test(check)) die("materialize --check serveur != 0. Restaure le backup avant d'investiguer.");

// 8) Preuves sentinelles.
console.log("\n[8] sentinelles…");
const s1ki = ssh(`node -e 'console.log(JSON.parse(require("fs").readFileSync("${LXX_SERVER}/1ki/fr.json"))["5"]["1"])'`).trim();
const sjob = ssh(`node -e 'console.log(JSON.parse(require("fs").readFileSync("${LXX_SERVER}/job/fr.json"))["25"]["1"])'`).trim();
console.log(`    1ki 5:1 -> ${s1ki.slice(0, 60)}`);
console.log(`    job 25:1 -> ${sjob.slice(0, 60)}`);
if (!/officiers approvisionnaient/.test(s1ki)) die("sentinelle 1ki 5:1 KO");
if (!/Baldad/.test(sjob)) die("sentinelle job 25:1 KO");

// 9) Diff serveur-après vs serveur-avant borné == partition attendue.
console.log("\n[9] diff borné serveur-après vs serveur-avant…");
execSync(`rsync -az -e ${JSON.stringify(SSH)} ${HOST}:${LXX_SERVER}/ ${tmp}/served-after/ --include='*/' --include='fr.json' --exclude='*'`, { stdio: "inherit" });
const actual = diffVerses(path.join(tmp, "served-before"), readFr, path.join(tmp, "served-after"), readFr);
const key = (r) => `${r.ref}|${r.a}|${r.z}`;
const expSet = new Set(expected.map(key)), actSet = new Set(actual.map(key));
const extra = actual.filter((r) => !expSet.has(key(r)));
const missing = expected.filter((r) => !actSet.has(key(r)));
fs.writeFileSync(path.join(tmp, "diff-serveur.json"), JSON.stringify({ actual, extra, missing }, null, 1));
console.log(`    serveur a changé ${actual.length} versets · attendus ${expected.length} · hors-partition ${extra.length} · manquants ${missing.length}`);
if (extra.length || missing.length) die(`diff serveur HORS partition attendue -> ${path.join(tmp, "diff-serveur.json")}. Restaure le backup (${ARB_SERVER}.bak.${TS}).`);
console.log(`    OK : le serveur a changé EXACTEMENT la partition validée (${actual.length} versets, ${[...expectedBooks].sort().join(",")}).`);
console.log(`\n[32mSYNC RÉUSSI[0m. Backup: ${ARB_SERVER}.bak.${TS}. Diff complet: ${path.join(tmp, "diff-serveur.json")}.`);
