// Matérialise les liens en fr.json (clé = verset grec) que le lecteur consomme.
// Source de vérité = Giguet immuable (data/giguet-lxx.json) + liens auto
// (data/lxx-links.json) + overrides Biblion (data/lxx-arbitration.json, gagnent).
// Rejoué à CHAQUE build : un build n'efface jamais le jugement de Biblion.
//
// Garanties : (1) zéro-perte — chaque verset Giguet consommé exactement une fois
// (lié ou orphelin) ; refus d'écrire sinon. (2) Les liens ne pointent que sur des
// versets Giguet existants. (3) Verset grec sans lien -> grec seul (jamais deviné).
//
//   node scripts/materialize-links.mjs            (dry-run + vérif zéro-perte)
//   node scripts/materialize-links.mjs --apply    (réécrit public/lxx/*/fr.json)
//   node scripts/materialize-links.mjs --check     (compare au fr.json actuel)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LXX = path.join(repo, "public/lxx");
const APPLY = process.argv.includes("--apply");
const CHECK = process.argv.includes("--check");

const giguet = JSON.parse(fs.readFileSync(path.join(repo, "data/giguet-lxx.json"), "utf8"));
const autoLinks = JSON.parse(fs.readFileSync(path.join(repo, "data/lxx-links.json"), "utf8"));
const ovPath = path.join(repo, "data/lxx-arbitration.json");
const overrides = fs.existsSync(ovPath) ? JSON.parse(fs.readFileSync(ovPath, "utf8")) : {};

const greekVerses = (id, ch) => {
  const p = path.join(LXX, id, `${ch}.json`);
  if (!fs.existsSync(p)) return null;
  return [...new Set(JSON.parse(fs.readFileSync(p, "utf8")).mots.map((m) => m.verse).filter((v) => v != null))].sort((a, b) => a - b);
};

let violations = 0,
  diffs = 0,
  books_done = 0;

for (const id of Object.keys(giguet)) {
  const frPath = path.join(LXX, id, "fr.json");
  if (!fs.existsSync(frPath)) continue;
  const current = JSON.parse(fs.readFileSync(frPath, "utf8"));
  const auto = autoLinks[id] || {};
  const ov = overrides[id] || {};
  const gAll = giguet[id];

  const consumed = new Set();
  const out = {}; // gCh -> {gV -> text}
  const greekChapters = new Set(
    Object.keys(current).filter((k) => k !== "_align").concat(Object.keys(auto).map((k) => k.split(":")[0])),
  );

  // 1) Applique les liens (override > auto) verset grec par verset grec.
  for (const gCh of greekChapters) {
    const gvs = greekVerses(id, gCh);
    if (!gvs) continue;
    out[gCh] = out[gCh] || {};
    for (const gV of gvs) {
      const key = `${gCh}:${gV}`;
      const link = ov[key]?.sources ?? auto[key]; // undefined = pas de lien, null = à arbitrer
      if (link == null) continue; // grec seul (sûr)
      const parts = [];
      for (const [c, v] of link) {
        const t = gAll[String(c)]?.[String(v)];
        if (t == null) {
          console.warn(`  ! ${id} ${key}: source Giguet ${c}:${v} inexistante`);
          violations++;
          continue;
        }
        if (consumed.has(`${c}:${v}`)) continue; // fusion : 1re prise gagne
        parts.push(t);
        consumed.add(`${c}:${v}`);
      }
      if (parts.length) out[gCh][gV] = parts.join(" ");
    }
  }

  // 2) Orphelins français : tout verset Giguet non consommé, rendu en fin de son
  //    chapitre grec « maison » (le lecteur les montre en lignes sans grec).
  for (const gigCh of Object.keys(gAll)) {
    for (const gigV of Object.keys(gAll[gigCh])) {
      if (consumed.has(`${gigCh}:${gigV}`)) continue;
      // report : cherche le chapitre grec où ce chapitre Giguet est majoritairement lié
      const home = homeChapter(auto, ov, gigCh) ?? gigCh;
      out[home] = out[home] || {};
      const gvs = greekVerses(id, home) || [0];
      let slot = Math.max(...gvs, ...Object.keys(out[home]).map(Number)) + 1;
      out[home][slot] = gAll[gigCh][gigV];
      consumed.add(`${gigCh}:${gigV}`);
    }
  }

  // Vérif zéro-perte : tout verset Giguet consommé exactement une fois.
  let lost = 0;
  for (const c of Object.keys(gAll)) for (const v of Object.keys(gAll[c])) if (!consumed.has(`${c}:${v}`)) lost++;
  if (lost) {
    console.warn(`  ! ${id}: ${lost} versets Giguet perdus`);
    violations += lost;
  }

  if (CHECK) {
    for (const gCh of Object.keys(out)) {
      for (const gV of Object.keys(out[gCh])) {
        const now = current[gCh]?.[gV];
        if (now != null && norm(now) !== norm(out[gCh][gV])) diffs++;
      }
    }
  }

  out._align = current._align;
  if (APPLY && !violations) {
    const tmp = frPath + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(out));
    fs.renameSync(tmp, frPath);
  }
  books_done++;
}

function norm(s) { return String(s).normalize("NFC").replace(/\s+/g, " ").trim(); }
function homeChapter(auto, ov, gigCh) {
  const count = {};
  for (const map of [auto, ov]) {
    for (const key of Object.keys(map)) {
      const link = map[key]?.sources ?? map[key];
      if (!Array.isArray(link)) continue;
      if (link.some(([c]) => String(c) === String(gigCh))) count[key.split(":")[0]] = (count[key.split(":")[0]] || 0) + 1;
    }
  }
  const best = Object.entries(count).sort((a, b) => b[1] - a[1])[0];
  return best ? best[0] : null;
}

console.log(`${APPLY ? "[APPLIED]" : CHECK ? "[CHECK]" : "[dry-run]"} ${books_done} livres, ${violations} violations zéro-perte/existence${CHECK ? `, ${diffs} versets différents du fr.json actuel` : ""}`);
if (violations) process.exit(1);
