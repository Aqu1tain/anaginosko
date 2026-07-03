// Rejoue les corrections de lemmatisation de Biblion (data/lxx-lemma-overrides.json)
// sur les chapitres LXX generes, puis met a jour les index derives (lemmas.json,
// occ/, distribution/) pour les lemmes touches. Idempotent : rejoue a chaque build,
// apres build-lxx et AVANT build-collocations (relancer les collocations ensuite).
//
//   node scripts/apply-lemma-overrides.mjs            (dry-run)
//   node scripts/apply-lemma-overrides.mjs --apply    (ecrit)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LXX = process.env.LXX_DATA_DIR || path.join(repo, "public/lxx");
const APPLY = process.argv.includes("--apply");
const NFC = (s) => (s ?? "").normalize("NFC");

const ovPath = path.join(repo, "data/lxx-lemma-overrides.json");
const rules = (JSON.parse(fs.readFileSync(ovPath, "utf8")).rules || []).map((r) => ({
  ...r,
  form: NFC(r.match.form),
  fromLemma: NFC(r.match.lemma),
  except: new Set(r.exceptBooks || []),
}));

const books = JSON.parse(fs.readFileSync(path.join(LXX, "books.json"), "utf8")).books;
// Ordre numerique des chapitres (comme build-lxx) : occ/ reste en ordre source.
const chapterFiles = (id) =>
  fs
    .readdirSync(path.join(LXX, id))
    .filter((f) => /^\d+\.json$/.test(f))
    .sort((a, b) => Number(a.slice(0, -5)) - Number(b.slice(0, -5)));

// 1) Patch des chapitres : reassigne lemme/nature/morph des mots qui matchent.
const touched = new Set(); // lemmes affectes (from + to)
let changed = 0;
for (const b of books) {
  for (const f of chapterFiles(b.id)) {
    const p = path.join(LXX, b.id, f);
    const data = JSON.parse(fs.readFileSync(p, "utf8"));
    let dirty = false;
    for (const m of data.mots) {
      for (const r of rules) {
        if (r.except.has(b.id)) continue;
        if (NFC(m.grec) !== r.form || NFC(m.lemme) !== r.fromLemma) continue;
        touched.add(r.fromLemma);
        touched.add(NFC(r.set.lemma));
        m.lemme = r.set.lemma;
        if (r.set.nature) m.nature = r.set.nature;
        if (r.set.morph) m.morph = r.set.morph;
        dirty = true;
        changed++;
        break;
      }
    }
    if (dirty && APPLY) fs.writeFileSync(p, JSON.stringify({ reference: data.reference, mots: data.mots }));
  }
}
console.log(`Mots reassignes : ${changed} | lemmes touches : ${[...touched].join(", ") || "aucun"}`);
if (!changed) process.exit(0);

// 2) Re-tally complet des comptes + occurrences (verite = chapitres corriges).
const lemmasPath = path.join(LXX, "lemmas.json");
const lemmas = JSON.parse(fs.readFileSync(lemmasPath, "utf8"));
const oidByLemma = new Map(lemmas.map((l) => [NFC(l.lemma), l.oid]));
const OCC_CAP = 500;
const counts = new Map(); // lemma -> count total
const occByOid = new Map(); // oid -> [{b,c,v,w,f}] (touched lemmes seulement)
for (const b of books) {
  for (const f of chapterFiles(b.id)) {
    const c = Number(f.slice(0, -5));
    const data = JSON.parse(fs.readFileSync(path.join(LXX, b.id, f), "utf8"));
    data.mots.forEach((m, i) => {
      const lem = NFC(m.lemme);
      counts.set(lem, (counts.get(lem) ?? 0) + 1);
      if (!touched.has(lem)) return;
      const oid = oidByLemma.get(lem);
      if (oid == null) return;
      if (!occByOid.has(oid)) occByOid.set(oid, []);
      const list = occByOid.get(oid);
      if (list.length < OCC_CAP) list.push({ b: b.id, c, v: m.verse, w: i * 2, f: m.grec });
    });
  }
}

// 3) Ecrit lemmas.json (comptes), occ/<oid>, distribution/<oid> pour les touches.
for (const l of lemmas) {
  const n = counts.get(NFC(l.lemma));
  if (n != null) l.count = n;
}
if (APPLY) fs.writeFileSync(lemmasPath, JSON.stringify(lemmas));

for (const lem of touched) {
  const oid = oidByLemma.get(lem);
  if (oid == null) continue;
  const occ = occByOid.get(oid) || [];
  const dist = {};
  for (const o of occ) dist[o.b] = (dist[o.b] ?? 0) + 1;
  console.log(`  ${lem} (oid ${oid}) : ${counts.get(lem)} occ, ${Object.keys(dist).length} livres`);
  if (APPLY) {
    fs.writeFileSync(path.join(LXX, "occ", `${oid}.json`), JSON.stringify(occ));
    fs.writeFileSync(path.join(LXX, "distribution", `${oid}.json`), JSON.stringify(dist));
  }
}
console.log(APPLY ? "[APPLIED] pense a relancer build-collocations (CORPUS_DIR=public/lxx)." : "[dry-run] relance avec --apply.");
