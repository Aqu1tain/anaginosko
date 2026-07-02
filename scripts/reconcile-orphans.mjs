// Réconcilie la passe « zéro orphelin » : 2 lecteurs indépendants par groupe sur
// l'inventaire (arbitrages + orphelins des deux côtés), résolutions par EXTRAITS.
// On n'expédie QUE les items où les deux lecteurs convergent EXACTEMENT (refs,
// sources, extraits aux mêmes bornes) ; divergence -> item de file pour Biblion.
// Après application : le fr.json de chaque livre touché est reconstruit DEPUIS les
// liens (le modèle devient l'unique source d'affichage), les orphelins déclarés
// (GII, plus latins, additions KAN-55) restent affichés en lignes de queue et sont
// consignés dans data/lxx-orphans.json.
//
//   node scripts/reconcile-orphans.mjs            (dry-run + rapport)
//   node scripts/reconcile-orphans.mjs --apply

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LXX = path.join(repo, "public/lxx");
const RES_DIR = process.env.RES_DIR || "/private/tmp/realign4";
const APPLY = process.argv.includes("--apply");

const giguet = JSON.parse(fs.readFileSync(path.join(repo, "data/giguet-lxx.json"), "utf8"));
const links = JSON.parse(fs.readFileSync(path.join(repo, "data/lxx-links.json"), "utf8"));
let queue = JSON.parse(fs.readFileSync(path.join(repo, "data/lxx-queue.json"), "utf8"));
const chapterState = JSON.parse(fs.readFileSync(path.join(repo, "data/lxx-chapter-state.json"), "utf8"));
const orphansPath = path.join(repo, "data/lxx-orphans.json");
const declaredOrphans = fs.existsSync(orphansPath) ? JSON.parse(fs.readFileSync(orphansPath, "utf8")) : {};

const gtext = (b, c, v) => giguet[b]?.[String(c)]?.[String(v)] ?? null;
const gwords = (b, c, v) => {
  const t = gtext(b, c, v);
  return t == null ? null : t.split(/\s+/).filter(Boolean);
};
const sliceSrc = (b, s) => {
  const w = gwords(b, s[0], s[1]);
  if (!w) return null;
  return s.length === 4 ? w.slice(s[2], s[3] + 1).join(" ") : w.join(" ");
};
const spanOf = (s, b) => (s.length === 4 ? [s[2], s[3]] : [0, (gwords(b, s[0], s[1]) || []).length - 1]);
const overlaps = (a, x) => a[0] <= x[1] && x[0] <= a[1];

// ---------- 1. Charger les lecteurs, apparier par issue id ----------
const files = fs.readdirSync(RES_DIR).filter((f) => /-(A|B)\.json$/.test(f));
const byGroup = new Map();
for (const f of files) {
  const m = f.match(/^(.+)-(A|B)\.json$/);
  const d = JSON.parse(fs.readFileSync(path.join(RES_DIR, f), "utf8"));
  if (!byGroup.has(m[1])) byGroup.set(m[1], {});
  byGroup.get(m[1])[m[2]] = d.items || [];
}

const normRes = (resolutions) =>
  JSON.stringify(
    (resolutions || [])
      .map((r) => ({ ref: r.ref, sources: (r.sources || []).map((s) => s.map(Number)) }))
      .sort((a, b) => a.ref.localeCompare(b.ref)),
  );
const normOrph = (orphans) => JSON.stringify((orphans || []).map((o) => o.giguet).sort());

let converged = [], diverged = [], missing = 0;
for (const [gid, readers] of byGroup) {
  if (!readers.A || !readers.B) {
    console.warn(`! groupe ${gid}: lecteur manquant — ignoré`);
    continue;
  }
  const A = new Map(readers.A.map((i) => [i.id, i]));
  const B = new Map(readers.B.map((i) => [i.id, i]));
  for (const id of new Set([...A.keys(), ...B.keys()])) {
    const a = A.get(id), b = B.get(id);
    if (!a || !b) {
      missing++;
      diverged.push({ id, a, b, why: "traité par un seul lecteur" });
      continue;
    }
    if (normRes(a.resolutions) === normRes(b.resolutions) && normOrph(a.orphans) === normOrph(b.orphans)) {
      converged.push({ id, resolutions: a.resolutions || [], orphans: a.orphans || [], why: a.why });
    } else {
      diverged.push({ id, a, b, why: "lectures différentes" });
    }
  }
}

// ---------- 2. Appliquer les convergents (liens + orphelins déclarés) ----------
const touchedBooks = new Set();
let applied = 0, rejected = 0;
const pendingRefs = new Map(); // book -> Set(ref) touchés par une divergence (grec seul)

for (const item of converged) {
  const book = item.id.split("|")[0];
  touchedBooks.add(book);
  for (const r of item.resolutions) {
    const bad = (r.sources || []).find((s) => {
      if (gtext(book, s[0], s[1]) == null) return true;
      if (s.length === 4) {
        const n = (gwords(book, s[0], s[1]) || []).length;
        if (!(s[2] >= 0 && s[2] <= s[3] && s[3] < n)) return true;
      }
      return false;
    });
    if (bad) {
      rejected++;
      diverged.push({ id: item.id, a: null, b: null, why: `source invalide ${JSON.stringify(bad)}` });
      item.resolutions = [];
      break;
    }
  }
  for (const r of item.resolutions) {
    links[book] = links[book] || {};
    links[book][r.ref] = (r.sources || []).map((s) => s.map(Number));
    applied++;
  }
  for (const o of item.orphans || []) {
    declaredOrphans[book] = declaredOrphans[book] || {};
    declaredOrphans[book][o.giguet] = o.why || "orphelin irréductible";
  }
}

// ---------- 3. Validation anti-chevauchement (par livre, état final) ----------
// On ne nullifie que les refs TOUCHÉES par cette passe : les chevauchements
// préexistants (artefacts du text-matching initial, refrains identiques) sont
// signalés et laissés à la passe suivante.
const appliedRefs = new Set();
for (const item of converged) {
  const book = item.id.split("|")[0];
  for (const r of item.resolutions) appliedRefs.add(`${book}:${r.ref}`);
}
let preexistingOverlaps = 0;
for (const book of touchedBooks) {
  const claims = new Map(); // "ch:v" -> [{ref, span}]
  for (const [ref, src] of Object.entries(links[book] || {})) {
    if (!Array.isArray(src)) continue;
    for (const s of src) {
      const k = `${s[0]}:${s[1]}`;
      if (!claims.has(k)) claims.set(k, []);
      claims.get(k).push({ ref, span: spanOf(s, book) });
    }
  }
  for (const [k, cs] of claims) {
    for (let i = 0; i < cs.length; i++)
      for (let j = i + 1; j < cs.length; j++)
        if (cs[i].ref !== cs[j].ref && overlaps(cs[i].span, cs[j].span)) {
          const involved = [cs[i], cs[j]].filter((c) => appliedRefs.has(`${book}:${c.ref}`));
          if (!involved.length) {
            preexistingOverlaps++;
            continue;
          }
          console.warn(`! ${book} ${k}: chevauchement ${cs[i].ref} / ${cs[j].ref} — refs de la passe nullifiées, en file`);
          for (const c of involved) {
            links[book][c.ref] = null;
            diverged.push({ id: `${book}|overlap|${c.ref}`, why: `chevauchement sur Giguet ${k}` });
          }
          rejected++;
        }
  }
}
if (preexistingOverlaps) console.log(`(chevauchements préexistants laissés à la passe suivante : ${preexistingOverlaps})`);

// ---------- 4. File : retirer les items résolus, ajouter les divergences ----------
const resolvedRefs = new Set();
for (const item of converged) {
  const book = item.id.split("|")[0];
  const key = item.id.split("|")[2];
  resolvedRefs.add(`${book}:${key}`);
  for (const r of item.resolutions) resolvedRefs.add(`${book}:${r.ref}`);
}
queue = queue.filter((it) => !resolvedRefs.has(`${it.book}:${it.ref}`));
for (const d of diverged) {
  const [book, kind, key] = d.id.split("|");
  const ref = /^\d+:\d+$/.test(key) && kind !== "french-unclaimed" ? key : null;
  queue.push({
    book, ref: ref ?? key, kind: "span-divergence", grain: "verse", priority: 1,
    reason: `Passe zéro-orphelin : ${d.why}. À trancher avec le picker (extraits).`,
    proposals: [
      d.a?.resolutions?.length ? { reader: "A", sources: d.a.resolutions[0].sources?.map((s) => s.map(String)) ?? [] } : null,
      d.b?.resolutions?.length ? { reader: "B", sources: d.b.resolutions[0].sources?.map((s) => s.map(String)) ?? [] } : null,
    ].filter(Boolean),
  });
  if (ref) {
    const [c] = key.split(":");
    if (chapterState[book]?.[c]) chapterState[book][c].pending = (chapterState[book][c].pending || 0) + 1;
  }
}

// ---------- 5. Reconstruction du fr.json des livres touchés DEPUIS les liens ----------
const report = {};
if (APPLY) {
  for (const book of touchedBooks) {
    const frPath = path.join(LXX, book, "fr.json");
    if (!fs.existsSync(frPath)) continue;
    const old = JSON.parse(fs.readFileSync(frPath, "utf8"));
    const fr = { _align: old._align };
    const consumed = new Set();
    const chapters = new Set(Object.keys(old).filter((k) => k !== "_align"));
    for (const ref of Object.keys(links[book] || {})) chapters.add(ref.split(":")[0]);
    for (const ch of chapters) {
      const out = {};
      for (const [ref, src] of Object.entries(links[book] || {})) {
        if (!ref.startsWith(`${ch}:`)) continue;
        if (!Array.isArray(src) || !src.length) continue;
        const text = src.map((s) => sliceSrc(book, s)).filter(Boolean).join(" ").trim();
        if (text) out[ref.split(":")[1]] = text;
        for (const s of src) consumed.add(`${s[0]}:${s[1]}:${s.length === 4 ? s[2] + "-" + s[3] : "all"}`);
      }
      if (Object.keys(out).length) fr[ch] = out;
    }
    // Orphelins déclarés : lignes de queue dans leur chapitre Giguet d'origine.
    for (const [k] of Object.entries(declaredOrphans[book] || {})) {
      const [c, v] = k.split(":").map(Number);
      const t = gtext(book, c, v);
      if (t == null) continue;
      const chKey = String(c);
      fr[chKey] = fr[chKey] || {};
      const nums = Object.keys(fr[chKey]).map(Number);
      const slot = Math.max(0, ...nums) + 1;
      fr[chKey][slot] = t;
    }
    const tmp = frPath + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(fr));
    fs.renameSync(tmp, frPath);
    report[book] = "reconstruit";
  }
  queue.sort((a, b) => a.priority - b.priority || a.book.localeCompare(b.book));
  fs.writeFileSync(path.join(repo, "data/lxx-links.json"), JSON.stringify(links));
  fs.writeFileSync(path.join(repo, "data/lxx-queue.json"), JSON.stringify(queue, null, 2));
  fs.writeFileSync(path.join(repo, "data/lxx-chapter-state.json"), JSON.stringify(chapterState));
  fs.writeFileSync(orphansPath, JSON.stringify(declaredOrphans, null, 1));
}

// ---------- 6. Rapport ----------
console.log(`convergents: ${converged.length} (liens appliqués: ${applied}) · divergents/rejetés: ${diverged.length} (dont ${missing} mono-lecteur, ${rejected} invalides) · orphelins déclarés: ${Object.values(declaredOrphans).reduce((a, o) => a + Object.keys(o).length, 0)}`);
console.log(`file: ${queue.length} items · livres reconstruits: ${Object.keys(report).join(", ") || "(dry-run)"}`);
console.log(APPLY ? "[APPLIED]" : "[dry-run] rien écrit.");
