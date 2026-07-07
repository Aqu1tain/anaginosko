// Tableau de bord « zéro orphelin » : pour chaque livre, l'état de couverture
// complet des deux côtés. Objectif final : chaque verset grec lié (ou orphelin
// grec documenté), chaque mot Giguet affiché exactement une fois (ou orphelin
// déclaré, ou en attente d'arbitrage dans la file).
//
//   node scripts/audit-coverage.mjs [--verbose]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isMarkerSegment, markerReason } from "../lib/lxx-materialize.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LXX = path.join(repo, "public/lxx");
const VERBOSE = process.argv.includes("--verbose");

const giguet = JSON.parse(fs.readFileSync(path.join(repo, "data/giguet-lxx.json"), "utf8"));
const links = JSON.parse(fs.readFileSync(path.join(repo, "data/lxx-links.json"), "utf8"));
const queue = JSON.parse(fs.readFileSync(path.join(repo, "data/lxx-queue.json"), "utf8"));
const orphansPath = path.join(repo, "data/lxx-orphans.json");
const declared = fs.existsSync(orphansPath) ? JSON.parse(fs.readFileSync(orphansPath, "utf8")) : {};
const arbPath = path.join(repo, "data/lxx-arbitration.json");
const overrides = fs.existsSync(arbPath) ? JSON.parse(fs.readFileSync(arbPath, "utf8")) : {};
// Lien EFFECTIF : override (Biblion) l'emporte sur l'auto. L'audit doit lire
// l'arbitrage, sinon il sur-compte des « gaps » déjà résolus par les 151.
const effSources = (book, ref) => (overrides[book]?.[ref] ? overrides[book][ref].sources : links[book]?.[ref]);

const queueRefs = new Set(queue.map((q) => `${q.book}:${q.ref}`));
const queueSources = new Set();
for (const q of queue) for (const p of q.proposals || []) for (const s of p.sources || []) queueSources.add(`${q.book}:${Number(s[0])}:${Number(s[1])}`);

const gwords = (b, c, v) => {
  const t = giguet[b]?.[String(c)]?.[String(v)];
  return t == null ? null : t.split(/\s+/).filter(Boolean);
};
const auditExcluded = []; // mots non couverts classés marqueur/ponctuation (journalisés, jamais ignorés)
// File de travail Phase 2 (dump GAPS_OUT) : le travail OUVERT (aucune décision) +
// les « à traduire (prouvé) » déjà documentés. Catégorie « à traduire (prouvé) »
// remplace « orphelin » (charte : verset grec sans français = traduction maison).
const gapGreekSansEtat = {}; // book -> [{ref, grec}]     verset grec sans lien/override/file/déclaration
const gapTrous = {}; //         book -> [{ref, ranges, text}] contenu Giguet non servi, non déclaré, non en file
const gapATraduire = {}; //     book -> [{ref, grec, cause}] grec documenté sans français (résolu)
const pushGap = (bag, book, entry) => { (bag[book] = bag[book] || []).push(entry); };

const ZERO = { greek: 0, greekLinked: 0, greekOrphan: 0, greekUnlinked: 0, greekQueued: 0, frVerses: 0, frCovered: 0, frDeclared: 0, frQueued: 0, frGap: 0, overlap: 0 };
const T = { ...ZERO };
for (const book of Object.keys(giguet).sort()) {
  if (!fs.existsSync(path.join(LXX, book))) continue;
  const stats = { ...ZERO };
  // côté grec
  for (const chFile of fs.readdirSync(path.join(LXX, book)).filter((f) => /^\d+\.json$/.test(f))) {
    const ch = chFile.replace(".json", "");
    const mots = JSON.parse(fs.readFileSync(path.join(LXX, book, chFile), "utf8")).mots;
    const verseText = new Map(); // v -> texte grec reconstruit (pour la file de lecture)
    for (const m of mots) if (m.verse != null) verseText.set(m.verse, (verseText.get(m.verse) ? verseText.get(m.verse) + " " : "") + m.grec);
    for (const v of [...verseText.keys()].sort((a, b) => a - b)) {
      stats.greek++;
      const ref = `${ch}:${v}`;
      const src = effSources(book, ref);
      if (Array.isArray(src) && src.length) stats.greekLinked++;
      else if (Array.isArray(src)) { stats.greekOrphan++; pushGap(gapATraduire, book, { ref, grec: verseText.get(v), cause: declared[book]?.[ref] ?? declared[book]?.["undefined"] ?? "grec sans français (déclaré)" }); }
      else if (queueRefs.has(`${book}:${ref}`)) stats.greekQueued++;
      else { stats.greekUnlinked++; pushGap(gapGreekSansEtat, book, { ref, grec: verseText.get(v) }); }
    }
  }
  // côté Giguet : couverture au mot
  const claims = new Map();
  const ov = overrides[book] || {};
  const addClaims = (src) => {
    if (!Array.isArray(src)) return;
    for (const s of src) {
      const k = `${s[0]}:${s[1]}`;
      if (!claims.has(k)) claims.set(k, []);
      const n = (gwords(book, s[0], s[1]) || []).length;
      claims.get(k).push(s.length === 4 ? [s[2], s[3]] : [0, n - 1]);
    }
  };
  for (const [ref, src] of Object.entries(links[book] || {})) if (!ov[ref]) addClaims(src); // auto non surchargé
  for (const ref of Object.keys(ov)) addClaims(ov[ref].sources); // + overrides Biblion
  for (const ch of Object.keys(giguet[book])) {
    for (const v of Object.keys(giguet[book][ch])) {
      stats.frVerses++;
      const k = `${ch}:${v}`;
      const words = gwords(book, ch, v) || [];
      const n = words.length;
      const spans = (claims.get(k) || []).sort((a, b) => a[0] - b[0]);
      // chevauchements
      for (let i = 1; i < spans.length; i++) if (spans[i][0] <= spans[i - 1][1]) stats.overlap++;
      // couverture au mot ; on regroupe les mots non couverts en plages, puis
      // chaque plage est soit un marqueur/ponctuation (exclusion nommée, journalisée),
      // soit de l'Écriture (trou). Un mot non couvert n'est JAMAIS ignoré sans trace.
      const cov = new Array(n).fill(false);
      for (const [f, t] of spans) for (let i = Math.max(0, f); i <= Math.min(t, n - 1); i++) cov[i] = true;
      const ranges = [];
      for (let i = 0, s = -1; i <= n; i++) {
        if (i < n && !cov[i]) { if (s < 0) s = i; }
        else if (s >= 0) { ranges.push([s, i - 1]); s = -1; }
      }
      const contentRanges = [];
      for (const [f, t] of ranges) {
        const seg = words.slice(f, t + 1).join(" ");
        if (isMarkerSegment(seg)) auditExcluded.push({ book, giguet: k, words: `${f + 1}-${t + 1}`, text: seg, reason: markerReason(seg) });
        else contentRanges.push([f, t]);
      }
      if (!contentRanges.length) stats.frCovered++;
      else if (declared[book]?.[k] != null) stats.frDeclared++;
      else if (queueSources.has(`${book}:${k}`)) stats.frQueued++;
      else {
        stats.frGap++;
        pushGap(gapTrous, book, { ref: k, ranges: contentRanges, text: contentRanges.map(([f, t]) => words.slice(f, t + 1).join(" ")).join(" … ") });
        if (VERBOSE) console.log(`  gap ${book} ${k}: contenu non couvert`);
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
if (process.env.EXCLUSIONS_OUT) {
  fs.writeFileSync(process.env.EXCLUSIONS_OUT, JSON.stringify(auditExcluded, null, 1));
  console.log(`exclusions nommées (marqueurs/ponctuation) -> ${process.env.EXCLUSIONS_OUT} (${auditExcluded.length} segments)`);
}
if (process.env.GAPS_OUT) {
  const count = (bag) => Object.values(bag).reduce((a, l) => a + l.length, 0);
  const gaps = {
    generated: "audit-coverage.mjs (instrument unique, arbitrage + content-aware)",
    summary: {
      grecSansEtat: T.greekUnlinked,
      trousOuverts: T.frGap,
      aTraduireProuve: T.greekOrphan,
      grecEnFile: T.greekQueued,
      frDeclares: T.frDeclared,
      frEnFile: T.frQueued,
      chevauchementsConnus: T.overlap,
    },
    greekSansEtat: gapGreekSansEtat,
    trous: gapTrous,
    aTraduireProuve: gapATraduire,
  };
  fs.writeFileSync(process.env.GAPS_OUT, JSON.stringify(gaps, null, 1));
  console.log(`file de couverture -> ${process.env.GAPS_OUT} (sans-état ${count(gapGreekSansEtat)}, trous ${count(gapTrous)}, à-traduire ${count(gapATraduire)})`);
}
process.exit(T.frGap + T.greekUnlinked + T.overlap > 0 ? 1 : 0);
