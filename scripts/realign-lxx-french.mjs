// Réaligne la traduction Giguet sur la versification grecque, livre par livre.
//
//   node scripts/realign-lxx-french.mjs --books isa,psa            (dry-run + audit)
//   node scripts/realign-lxx-french.mjs --books isa,psa --apply    (réécrit fr.json)
//
// Pour chaque chapitre divergent : détecte le décalage δ par recouvrement d'ancres
// (noms propres). « shift » → réécrit fr.json (clé = verset grec), avec débordement
// d'un verset de bord vers le chapitre voisin. « unresolved » → laissé en bloc.
// Écrit un audit JSON détaillant chaque décision (à relire avant de publier).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { detectOffset, loadGreekChapter, anchorScore } from "./lib/lxx-align.mjs";

const ROOT = process.env.LXX_DIR || "public/lxx";
const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const booksArg = (args[args.indexOf("--books") + 1] || "").split(",").map((s) => s.trim()).filter(Boolean);
const AUDIT_DIR = process.env.AUDIT_DIR || "/private/tmp/lxx-realign";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(__dirname, "..");
const rootAbs = path.resolve(repo, ROOT);

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function chaptersOf(id) {
  const booksMeta = readJSON(path.join(rootAbs, "books.json"));
  const list = Array.isArray(booksMeta) ? booksMeta : booksMeta.books || Object.values(booksMeta);
  const b = list.find((x) => x.id === id);
  if (!b) return [];
  return b.chapterList || Array.from({ length: b.chapters || 0 }, (_, i) => i + 1);
}

function greekVerseSet(byVerse) {
  return new Set([...byVerse.keys()]);
}

// Plan d'un chapitre « shift » : où atterrit chaque verset français.
function planShift(frCh, delta, greekCur) {
  const cur = greekVerseSet(greekCur);
  const minCur = Math.min(...cur),
    maxCur = Math.max(...cur);
  const inRange = new Map(); // targetVerse -> text
  const spillPrev = []; // [{v, text}] versets tombés avant le chapitre
  const spillNext = [];
  for (const vs of Object.keys(frCh).map(Number).sort((a, b) => a - b)) {
    const target = vs + delta;
    const text = frCh[String(vs)];
    if (cur.has(target)) {
      if (inRange.has(target)) return null; // collision : on abandonne (sécurité)
      inRange.set(target, text);
    } else if (target < minCur) spillPrev.push({ v: vs, text });
    else if (target > maxCur) spillNext.push({ v: vs, text });
    else return null; // trou interne : pas un simple décalage
  }
  return { inRange, spillPrev, spillNext };
}

function processBook(id) {
  const frPath = path.join(rootAbs, id, "fr.json");
  if (!fs.existsSync(frPath)) return null;
  const fr = readJSON(frPath);
  const chs = chaptersOf(id);
  const greek = new Map(); // ch -> byVerse Map
  for (const ch of chs) {
    const g = loadGreekChapter(rootAbs, id, ch);
    if (g) greek.set(ch, g);
  }

  const audit = [];
  const plans = new Map(); // ch -> { delta, inRange, spillPrev, spillNext }

  // 1) Détection + plans in-range (sans débordement encore).
  for (const ch of chs) {
    const frCh = fr[String(ch)];
    const g = greek.get(ch);
    if (!frCh || !Object.keys(frCh).length || !g) continue;
    const gset = greekVerseSet(g);
    const fset = new Set(Object.keys(frCh).map(Number));
    const aligned = gset.size === fset.size && [...gset].every((v) => fset.has(v));
    if (aligned) {
      audit.push({ ch, status: "already-aligned" });
      continue;
    }
    const det = detectOffset(frCh, g);
    if (det.verdict === "aligned") {
      // δ=0 gagne : versets partagés déjà bons, écart bénin (verset en plus/moins).
      audit.push({ ch, status: "aligned-benign", best: det.best, zero: det.zero });
      continue;
    }
    if (det.verdict === "unresolved") {
      audit.push({ ch, status: "block", reason: "no-confident-offset", ranked: det.ranked.slice(0, 3) });
      continue;
    }
    const plan = planShift(frCh, det.delta, g);
    if (!plan) {
      audit.push({ ch, status: "block", reason: "spill-not-clean", delta: det.delta });
      continue;
    }
    plans.set(ch, { delta: det.delta, ...plan, det });
  }

  // 2) Résolution des débordements de bord (un seul verset), vers le chapitre
  //    voisin, dans son emplacement grec vacant adéquat. Sinon → bloc.
  const newFr = JSON.parse(JSON.stringify(fr));
  const occupied = new Map(); // ch -> Set(targets in-range)
  for (const [ch, p] of plans) occupied.set(ch, new Set(p.inRange.keys()));

  const downgraded = new Set();
  for (const [ch, p] of plans) {
    const place = (spills, neighborCh, pickHighest) => {
      if (!spills.length) return true;
      if (spills.length > 1) return false; // on n'auto-applique qu'un verset de bord
      const g = greek.get(neighborCh);
      if (!g) return false;
      const occ = occupied.get(neighborCh) || new Set(Object.keys(newFr[String(neighborCh)] || {}).map(Number));
      const vacant = [...greekVerseSet(g)].filter((v) => !occ.has(v)).sort((a, b) => a - b);
      if (!vacant.length) return false;
      const slot = pickHighest ? vacant[vacant.length - 1] : vacant[0];
      spills[0].slot = { ch: neighborCh, verse: slot };
      occ.add(slot);
      occupied.set(neighborCh, occ);
      return true;
    };
    const okPrev = place(p.spillPrev, ch - 1, true);
    const okNext = place(p.spillNext, ch + 1, false);
    if (!okPrev || !okNext) {
      downgraded.add(ch);
      audit.push({ ch, status: "block", reason: "spill-unplaceable", delta: p.delta });
    }
  }

  // 3) Écriture du nouveau français.
  for (const [ch, p] of plans) {
    if (downgraded.has(ch)) continue;
    const obj = {};
    for (const [target, text] of [...p.inRange].sort((a, b) => a[0] - b[0])) obj[String(target)] = text;
    newFr[String(ch)] = obj;
    for (const sp of [...p.spillPrev, ...p.spillNext]) {
      if (!sp.slot) continue;
      newFr[String(sp.slot.ch)] = newFr[String(sp.slot.ch)] || {};
      newFr[String(sp.slot.ch)][String(sp.slot.verse)] = sp.text;
    }
  }

  // 4) Vérification : re-score chaque chapitre réécrit à δ=0 (doit être bon).
  for (const [ch, p] of plans) {
    if (downgraded.has(ch)) continue;
    const g = greek.get(ch);
    const before = detectOffset(fr[String(ch)], g);
    let after = 0,
      gained = 0;
    for (const v of Object.keys(newFr[String(ch)]).map(Number)) {
      if (g.has(v)) after += anchorScore(newFr[String(ch)][String(v)], g.get(v));
    }
    audit.push({
      ch,
      status: "rekeyed",
      delta: p.delta,
      scoreBefore0: before.zero.total,
      scoreAfter0: +after.toFixed(2),
      spill: [...p.spillPrev, ...p.spillNext].map((s) => s.slot && `${ch}:${s.v}->${s.slot.ch}:${s.slot.verse}`).filter(Boolean),
    });
  }

  if (APPLY) fs.writeFileSync(frPath, JSON.stringify(newFr));
  audit.sort((a, b) => a.ch - b.ch);
  return { id, audit };
}

fs.mkdirSync(AUDIT_DIR, { recursive: true });
const targets = booksArg.length ? booksArg : [];
if (!targets.length) {
  console.error("usage: --books a,b,c [--apply]");
  process.exit(1);
}
const summary = [];
for (const id of targets) {
  const res = processBook(id);
  if (!res) {
    console.log(`${id}: pas de fr.json`);
    continue;
  }
  fs.writeFileSync(path.join(AUDIT_DIR, `${id}.json`), JSON.stringify(res.audit, null, 2));
  const counts = {};
  for (const a of res.audit) counts[a.status] = (counts[a.status] || 0) + 1;
  summary.push({ id, counts });
  console.log(`${id} ${APPLY ? "[APPLIED]" : "[dry-run]"}: ${JSON.stringify(counts)}`);
}
console.log("\nAudit JSON written to", AUDIT_DIR);
