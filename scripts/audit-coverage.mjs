// Tableau de bord « zéro orphelin » : pour chaque livre, l'état de couverture
// complet des deux côtés. Objectif final : chaque verset grec lié (ou orphelin
// grec documenté), chaque mot Giguet affiché exactement une fois (ou orphelin
// déclaré, ou en attente d'arbitrage dans la file).
//
//   node scripts/audit-coverage.mjs [--verbose]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LXX = path.join(repo, "public/lxx");
const VERBOSE = process.argv.includes("--verbose");

const giguet = JSON.parse(fs.readFileSync(path.join(repo, "data/giguet-lxx.json"), "utf8"));
const links = JSON.parse(fs.readFileSync(path.join(repo, "data/lxx-links.json"), "utf8"));
const queue = JSON.parse(fs.readFileSync(path.join(repo, "data/lxx-queue.json"), "utf8"));
const orphansPath = path.join(repo, "data/lxx-orphans.json");
const declared = fs.existsSync(orphansPath) ? JSON.parse(fs.readFileSync(orphansPath, "utf8")) : {};

const queueRefs = new Set(queue.map((q) => `${q.book}:${q.ref}`));
const queueSources = new Set();
for (const q of queue) for (const p of q.proposals || []) for (const s of p.sources || []) queueSources.add(`${q.book}:${Number(s[0])}:${Number(s[1])}`);

const gwords = (b, c, v) => {
  const t = giguet[b]?.[String(c)]?.[String(v)];
  return t == null ? null : t.split(/\s+/).filter(Boolean);
};

const ZERO = { greek: 0, greekLinked: 0, greekOrphan: 0, greekUnlinked: 0, greekQueued: 0, frVerses: 0, frCovered: 0, frDeclared: 0, frQueued: 0, frGap: 0, overlap: 0 };
const T = { ...ZERO };
for (const book of Object.keys(giguet).sort()) {
  if (!fs.existsSync(path.join(LXX, book))) continue;
  const stats = { ...ZERO };
  // côté grec
  for (const chFile of fs.readdirSync(path.join(LXX, book)).filter((f) => /^\d+\.json$/.test(f))) {
    const ch = chFile.replace(".json", "");
    const verses = [...new Set(JSON.parse(fs.readFileSync(path.join(LXX, book, chFile), "utf8")).mots.map((m) => m.verse).filter((v) => v != null))];
    for (const v of verses) {
      stats.greek++;
      const src = links[book]?.[`${ch}:${v}`];
      if (Array.isArray(src) && src.length) stats.greekLinked++;
      else if (Array.isArray(src)) stats.greekOrphan++;
      else if (queueRefs.has(`${book}:${ch}:${v}`)) stats.greekQueued++;
      else stats.greekUnlinked++;
    }
  }
  // côté Giguet : couverture au mot
  const claims = new Map();
  for (const [ref, src] of Object.entries(links[book] || {})) {
    if (!Array.isArray(src)) continue;
    for (const s of src) {
      const k = `${s[0]}:${s[1]}`;
      if (!claims.has(k)) claims.set(k, []);
      const n = (gwords(book, s[0], s[1]) || []).length;
      claims.get(k).push(s.length === 4 ? [s[2], s[3]] : [0, n - 1]);
    }
  }
  for (const ch of Object.keys(giguet[book])) {
    for (const v of Object.keys(giguet[book][ch])) {
      stats.frVerses++;
      const k = `${ch}:${v}`;
      const n = (gwords(book, ch, v) || []).length;
      const spans = (claims.get(k) || []).sort((a, b) => a[0] - b[0]);
      // chevauchements
      for (let i = 1; i < spans.length; i++) if (spans[i][0] <= spans[i - 1][1]) stats.overlap++;
      // couverture
      let covered = 0, cursor = 0;
      for (const [f, t] of spans) { covered += Math.max(0, Math.min(t, n - 1) - Math.max(f, cursor) + 1); cursor = Math.max(cursor, t + 1); }
      if (covered >= n) stats.frCovered++;
      else if (declared[book]?.[k] != null) stats.frDeclared++;
      else if (queueSources.has(`${book}:${k}`)) stats.frQueued++;
      else {
        stats.frGap++;
        if (VERBOSE) console.log(`  gap ${book} ${k}: ${covered}/${n} mots couverts`);
      }
    }
  }
  for (const key of Object.keys(T)) T[key] += stats[key];
  const flag = stats.frGap || stats.greekUnlinked || stats.overlap ? "  <-- à traiter" : "";
  console.log(
    `${book}: grec ${stats.greekLinked}/${stats.greek} liés, ${stats.greekOrphan} orphelins doc., ${stats.greekQueued} en file, ${stats.greekUnlinked} SANS ÉTAT · Giguet ${stats.frCovered}/${stats.frVerses} couverts, ${stats.frDeclared} déclarés, ${stats.frQueued} en file, ${stats.frGap} TROUS, ${stats.overlap} chevauchements${flag}`,
  );
}
console.log(
  `\nTOTAL: grec ${T.greekLinked}/${T.greek} liés · ${T.greekOrphan} orphelins doc. · ${T.greekQueued} file · ${T.greekUnlinked} sans état || Giguet ${T.frCovered}/${T.frVerses} couverts · ${T.frDeclared} déclarés · ${T.frQueued} file · ${T.frGap} trous · ${T.overlap} chevauchements`,
);
process.exit(T.frGap + T.greekUnlinked + T.overlap > 0 ? 1 : 0);
