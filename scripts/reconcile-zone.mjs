// Réconcilie les lectures redondantes de la zone de transposition Siracide (30-36).
// Deux lecteurs indépendants par moitié (H1a/H1b: grec 30-33 ; H2a/H2b: grec 34-36).
// On n'expédie QUE les versets où les deux lecteurs convergent ; divergence -> ce
// verset grec reste sans français (bloc honnête au verset). Le suivi de consommation
// est GLOBAL (les deux moitiés) : un verset Giguet ne peut être employé deux fois à
// la couture. Garde-fou zéro-perte : chaque verset Giguet de la zone est placé une
// seule fois (paire, orphelin, ou report). Écriture atomique.
//
//   node scripts/reconcile-zone.mjs            (dry-run + rapport)
//   node scripts/reconcile-zone.mjs --apply

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadGreekChapter } from "./lib/lxx-align.mjs";

const APPLY = process.argv.includes("--apply");
const RES_DIR = process.env.RES_DIR || "/private/tmp/realign2";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "public/lxx");
const ZONE = [30, 31, 32, 33, 34, 35, 36];
const HALVES = [
  { labels: ["H1a", "H1b"], greek: [30, 31, 32, 33] },
  { labels: ["H2a", "H2b"], greek: [34, 35, 36] },
];
const HOME = { 30: 30, 31: 34, 32: 35, 33: 36, 34: 31, 35: 32, 36: 33 }; // giguet -> grec (report)

const read = (label) => {
  const p = path.join(RES_DIR, `zone-${label}.json`);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null;
};
const toArr = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);
const isSplitWhy = (w) => /seconde moiti|suite de|split|d[eé]coupage/i.test(w || "");
const SPLIT_GR = /gr\s*\d*\s*:?\s*(\d+)/i;

// Normalise un chapitre grec d'un lecteur -> { map: gr -> [{frCh,frV}], orphanGreek:Set, trueOrphanF:[{frCh,frV}] }.
function normalize(chapter) {
  const map = new Map();
  const push = (gr, frCh, frV) => {
    if (!map.has(gr)) map.set(gr, []);
    if (!map.get(gr).some((s) => s.frCh === frCh && s.frV === frV)) map.get(gr).push({ frCh, frV });
  };
  for (const p of chapter.pairs || []) {
    push(p.gr, p.frCh, p.frV);
    for (const e of toArr(p.frVExtra)) push(p.gr, p.frCh, Number(e));
  }
  const trueOrphanF = [];
  for (const o of chapter.orphanFrench || []) {
    const m = (o.why || "").match(SPLIT_GR);
    if (isSplitWhy(o.why) && m) push(Number(m[1]), o.frCh, o.frV);
    else trueOrphanF.push({ frCh: o.frCh, frV: o.frV });
  }
  for (const [, list] of map) list.sort((a, b) => a.frCh - b.frCh || a.frV - b.frV);
  return { map, orphanGreek: new Set((chapter.orphanGreek || []).map((o) => o.gr)), trueOrphanF };
}

const sameSrc = (a, b) => a.length === b.length && a.every((s, i) => s.frCh === b[i].frCh && s.frV === b[i].frV);
const keyOf = (s) => `${s.frCh}:${s.frV}`;

const fr = JSON.parse(fs.readFileSync(path.join(ROOT, "sir", "fr.json"), "utf8"));
const orig = JSON.parse(JSON.stringify(fr));
const gVerses = (ch) => [...loadGreekChapter(ROOT, "sir", ch).keys()].sort((a, b) => a - b);
const gMax = (ch) => Math.max(...gVerses(ch));

const consumed = new Set(); // "frCh:frV"
const newZone = {}; // gch -> {greekVerse|orphanSlot -> text}
const nextSlot = {}; // slot orphelin courant par chapitre (juste après le max grec)
const takeSlot = (ch) => {
  if (nextSlot[ch] == null) nextSlot[ch] = gMax(ch) + 1;
  while (newZone[ch] && newZone[ch][nextSlot[ch]] != null) nextSlot[ch]++;
  return nextSlot[ch]++;
};
const stats = { converged: 0, diverged: 0, orphanGreek: 0, orphanFrench: 0 };
const perCh = [];

for (const half of HALVES) {
  const A = read(half.labels[0]),
    B = read(half.labels[1]);
  if (!A || !B) {
    console.error(`manque lecteur ${half.labels.filter((l) => !read(l))}`);
    process.exit(1);
  }
  for (const gch of half.greek) {
    const na = normalize(A.greekChapters[String(gch)] || {});
    const nb = normalize(B.greekChapters[String(gch)] || {});
    newZone[gch] = newZone[gch] || {};
    const rep = { gch, converged: 0, diverged: [], orphanGreek: [], orphanFrench: [] };
    for (const gr of gVerses(gch)) {
      const sa = na.map.get(gr),
        sb = nb.map.get(gr);
      if (na.orphanGreek.has(gr) && nb.orphanGreek.has(gr)) {
        rep.orphanGreek.push(gr);
        stats.orphanGreek++;
        continue;
      }
      const primaryAgree = sa && sb && sa[0] && sb[0] && sa[0].frCh === sb[0].frCh && sa[0].frV === sb[0].frV;
      if (primaryAgree) {
        // Convergence sur la source PRIMAIRE : on expédie l'intersection ordonnée
        // (les deux lecteurs d'accord). Les sources d'un seul lecteur (doublet
        // contesté, découpe divergente) partent au balayage orphelin -> pas de winner.
        const setB = new Set(sb.map(keyOf));
        const common = sa.filter((s) => setB.has(keyOf(s)));
        const parts = [];
        for (const s of common) {
          if (consumed.has(keyOf(s))) continue; // fusion : 1re prise gagne
          const t = orig[String(s.frCh)]?.[String(s.frV)];
          if (t != null) {
            parts.push(t);
            consumed.add(keyOf(s));
          }
        }
        if (parts.length) newZone[gch][gr] = parts.join(" ");
        stats.converged++;
        rep.converged++;
      } else {
        rep.diverged.push(`gr${gr}: ${sa ? sa.map(keyOf).join("+") : "?"} vs ${sb ? sb.map(keyOf).join("+") : "?"}`);
        stats.diverged++;
      }
    }
    // Orphelins français vrais : seulement si les DEUX les déclarent.
    const setB = new Set(nb.trueOrphanF.map(keyOf));
    for (const o of na.trueOrphanF) {
      if (!setB.has(keyOf(o)) || consumed.has(keyOf(o))) continue;
      const t = orig[String(o.frCh)]?.[String(o.frV)];
      if (t == null) continue;
      const s = takeSlot(gch);
      newZone[gch][s] = t;
      consumed.add(keyOf(o));
      rep.orphanFrench.push(`${keyOf(o)}->${gch}:${s}`);
      stats.orphanFrench++;
    }
    perCh.push(rep);
  }
}

// Garde-fou zéro-perte : reporter tout verset Giguet non consommé (divergences, etc.)
const leftover = [];
for (const gch of ZONE) {
  const target = HOME[gch];
  for (const v of Object.keys(orig[String(gch)] || {})) {
    if (consumed.has(`${gch}:${v}`)) continue;
    newZone[target] = newZone[target] || {};
    const s = takeSlot(target);
    newZone[target][s] = orig[String(gch)][v];
    consumed.add(`${gch}:${v}`);
    leftover.push(`${gch}:${v}->${target}:${s}`);
  }
}

console.log("=== réconciliation zone Siracide 30-36 ===");
for (const r of perCh.sort((a, b) => a.gch - b.gch)) {
  console.log(`grec ${r.gch}: ${r.converged} convergents / ${r.diverged.length} divergences / ${r.orphanGreek.length} orph.grec / ${r.orphanFrench.length} orph.fr`);
  for (const d of r.diverged) console.log(`    ~ ${d}`);
}
console.log(`\nTOTAL: ${stats.converged} paires, ${stats.diverged} divergences, ${stats.orphanGreek} orph.grec, ${stats.orphanFrench} orph.fr`);
console.log(`Report zéro-perte (versets non convergents replacés en orphelins): ${leftover.length}`, leftover.slice(0, 20).join(" "));

// Vérif zéro-perte finale.
const lost = [];
for (const gch of ZONE) for (const v of Object.keys(orig[String(gch)] || {})) if (!consumed.has(`${gch}:${v}`)) lost.push(`${gch}:${v}`);
console.log(`Versets Giguet perdus (doit être 0): ${lost.length}`, lost.join(" "));

if (APPLY) {
  const blocks = new Set((fr._align?.blocks || []).map(Number));
  for (const gch of ZONE) {
    fr[String(gch)] = newZone[gch] || {};
    const r = perCh.find((x) => x.gch === gch);
    const need = Math.ceil(gVerses(gch).length / 2);
    if (r && r.converged >= need) blocks.delete(gch);
    else blocks.add(gch);
  }
  fr._align = { blocks: [...blocks].sort((a, b) => a - b), tool: "reconcile-zone" };
  const tmp = path.join(ROOT, "sir", "fr.json.tmp");
  fs.writeFileSync(tmp, JSON.stringify(fr));
  fs.renameSync(tmp, path.join(ROOT, "sir", "fr.json"));
  console.log("\n[APPLIED] sir/fr.json réécrit (atomique).");
} else {
  console.log("\n[dry-run] rien écrit.");
}
