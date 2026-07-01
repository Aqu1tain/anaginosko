// Barrière d'intégrité post-passe. Pour chaque livre touché :
//  - GAGNÉ doit être 0 (aucun texte inventé ni dupliqué) ;
//  - PERDU doit égaler EXACTEMENT le texte des sources « en attente d'arbitrage »
//    (data/lxx-pending.json) : le français des versets disputés n'est pas affiché
//    (grec seul = état honnête) mais rien d'autre ne doit manquer.
//
//   PRE_DIR=<dossier snapshots> node scripts/check-scale-integrity.mjs <livres...>

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PRE = process.env.PRE_DIR;
const books = process.argv.slice(2);
if (!PRE || !books.length) {
  console.error("usage: PRE_DIR=<snapshots> node scripts/check-scale-integrity.mjs <livres...>");
  process.exit(1);
}

const giguet = JSON.parse(fs.readFileSync(path.join(repo, "data/giguet-lxx.json"), "utf8"));
const pendPath = path.join(repo, "data/lxx-pending.json");
const pending = fs.existsSync(pendPath) ? JSON.parse(fs.readFileSync(pendPath, "utf8")) : {};

const addWords = (m, text, sign = 1) => {
  for (const w of String(text).normalize("NFC").toLowerCase().match(/\p{L}+/gu) || [])
    m.set(w, (m.get(w) || 0) + sign);
};
const words = (o) => {
  const m = new Map();
  for (const ch of Object.keys(o)) {
    if (ch === "_align") continue;
    for (const v of Object.keys(o[ch])) addWords(m, o[ch][v]);
  }
  return m;
};

let fail = 0;
for (const id of books) {
  const before = words(JSON.parse(fs.readFileSync(path.join(PRE, `${id}.json`), "utf8")));
  const after = words(JSON.parse(fs.readFileSync(path.join(repo, "public/lxx", id, "fr.json"), "utf8")));
  // multiset attendu des pertes = texte des sources en attente
  const expected = new Map();
  for (const key of pending[id] || []) {
    const [c, v] = key.split(":");
    const t = giguet[id]?.[c]?.[v];
    if (t != null) addWords(expected, t);
  }
  let lostUnexpected = 0, gained = 0, pendingMissing = 0;
  const exL = [], exG = [];
  for (const [w, c] of before) {
    const d = c - (after.get(w) || 0) - (expected.get(w) || 0);
    if (d > 0) { lostUnexpected += d; if (exL.length < 6) exL.push(`${w}×${d}`); }
  }
  for (const [w, c] of after) {
    const d = c - (before.get(w) || 0);
    if (d > 0) { gained += d; if (exG.length < 6) exG.push(`${w}×${d}`); }
  }
  // les pertes attendues doivent être réelles (pas de pending affiché deux fois)
  for (const [w, c] of expected) {
    const actualLost = (before.get(w) || 0) - (after.get(w) || 0);
    if (actualLost < c) pendingMissing += c - actualLost;
  }
  const ok = lostUnexpected === 0 && gained === 0 && pendingMissing === 0;
  if (!ok) fail++;
  const pendCount = (pending[id] || []).length;
  console.log(
    `${id}: ${ok ? "OK" : "ÉCART"} (perdus-inattendus ${lostUnexpected}${exL.length ? " ex:" + exL.join(",") : ""} · gagnés ${gained}${exG.length ? " ex:" + exG.join(",") : ""} · en-attente ${pendCount}${pendingMissing ? " dont ENCORE AFFICHÉS " + pendingMissing + " mots" : ""})`,
  );
}
console.log(fail ? `\n${fail} livre(s) en écart — NE PAS expédier.` : "\nIntégrité conservée sur tous les livres (pertes = uniquement le français en attente d'arbitrage).");
process.exit(fail ? 1 : 0);
