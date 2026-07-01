// Applique les décisions de réalignement produites par les agents (round 2).
// Chaque agent écrit un fichier /private/tmp/realign2/<label>.json :
//   { "book":"sir",
//     "chapters": { "12": {"offset":-1}, "13": {"offset":2,"merges":[[20,21]]} },
//     "keepBlocked": [18], "notes": {"18":"..."} }
// On applique offset (+ fusions) au texte Giguet réel (jamais réécrit à la main),
// on gère un débordement de bord vers le chapitre voisin, on retire les chapitres
// traités de _align.blocks (sauf keepBlocked). Traitement séquentiel = zéro course.
//
//   node scripts/apply-realign-results.mjs            (dry-run)
//   node scripts/apply-realign-results.mjs --apply

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadGreekChapter } from "./lib/lxx-align.mjs";

const APPLY = process.argv.includes("--apply");
const RES_DIR = process.env.RES_DIR || "/private/tmp/realign2";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "public/lxx");

const results = fs.existsSync(RES_DIR)
  ? fs.readdirSync(RES_DIR).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(fs.readFileSync(path.join(RES_DIR, f), "utf8")))
  : [];

// Regroupe par livre (plusieurs agents peuvent couvrir des chapitres disjoints).
const byBook = new Map();
for (const r of results) {
  if (!r.book || !r.chapters) continue;
  if (!byBook.has(r.book)) byBook.set(r.book, { chapters: {}, keepBlocked: new Set() });
  const b = byBook.get(r.book);
  Object.assign(b.chapters, r.chapters);
  for (const ch of r.keepBlocked || []) b.keepBlocked.add(Number(ch));
}

const greekSet = (id, ch) => {
  const g = loadGreekChapter(ROOT, id, ch);
  return g ? new Set(g.keys()) : null;
};

let touchedChapters = 0,
  spills = 0,
  warnings = 0;

for (const [id, spec] of byBook) {
  const frPath = path.join(ROOT, id, "fr.json");
  const fr = JSON.parse(fs.readFileSync(frPath, "utf8"));
  const blocks = new Set((fr._align?.blocks || []).map(Number));
  // Snapshot avant toute mutation : les remaps de transposition lisent la source
  // (ex. Giguet 31 -> grec 34) depuis l'original, même si ce chapitre est lui-même
  // réécrit dans la même passe (grec 31 <- Giguet 34).
  const orig = JSON.parse(JSON.stringify(fr));

  for (const [chStr, plan] of Object.entries(spec.chapters)) {
    const ch = Number(chStr);
    const cur = greekSet(id, ch);
    if (!cur) {
      console.warn(`  ! ${id} ${ch}: pas de grec, ignoré`);
      warnings++;
      continue;
    }
    // `sourceChapter` : le français vient d'un AUTRE chapitre Giguet (transposition
    // Siracide). Par défaut, même chapitre.
    const src = { ...(orig[String(plan.sourceChapter ?? ch)] || {}) };

    // Fusions (Giguet a scindé un verset grec) : concatène b dans a, supprime b.
    for (const [a, b] of plan.merges || []) {
      if (src[String(a)] != null && src[String(b)] != null) {
        src[String(a)] = `${src[String(a)]} ${src[String(b)]}`.trim();
        delete src[String(b)];
      }
    }

    // Construit la nouvelle numérotation.
    const minCur = Math.min(...cur),
      maxCur = Math.max(...cur);
    const newCh = {};
    const spillPrev = [],
      spillNext = [];
    const entries = Object.keys(src).map(Number).sort((a, b) => a - b);
    for (const v of entries) {
      const target = plan.map ? plan.map[String(v)] : v + (plan.offset ?? 0);
      const t = Number(target);
      if (cur.has(t)) newCh[t] = newCh[t] ? `${newCh[t]} ${src[v]}`.trim() : src[v];
      else if (t < minCur) spillPrev.push(src[v]);
      else if (t > maxCur) spillNext.push(src[v]);
      else {
        console.warn(`  ! ${id} ${ch}: cible ${t} hors grec (verset ${v}), chapitre gardé en bloc`);
        warnings++;
        spec.keepBlocked.add(ch);
      }
    }
    if (spec.keepBlocked.has(ch)) continue;

    // Débordement de bord (un seul verset) vers le chapitre voisin, emplacement vacant.
    const placeSpill = (list, neighborCh, high) => {
      if (!list.length) return true;
      if (list.length > 1) return false;
      const g = greekSet(id, neighborCh);
      if (!g) return false;
      fr[String(neighborCh)] = fr[String(neighborCh)] || {};
      const occ = new Set(Object.keys(fr[String(neighborCh)]).map(Number));
      const vacant = [...g].filter((x) => !occ.has(x)).sort((a, b) => a - b);
      if (!vacant.length) return false;
      const slot = high ? vacant[vacant.length - 1] : vacant[0];
      fr[String(neighborCh)][String(slot)] = list[0];
      spills++;
      return true;
    };
    const okP = placeSpill(spillPrev, ch - 1, true);
    const okN = placeSpill(spillNext, ch + 1, false);
    if (!okP || !okN) {
      console.warn(`  ! ${id} ${ch}: débordement non plaçable, gardé en bloc`);
      warnings++;
      spec.keepBlocked.add(ch);
      continue;
    }

    fr[chStr] = newCh;
    blocks.delete(ch);
    touchedChapters++;
  }

  for (const ch of spec.keepBlocked) blocks.add(ch);
  fr._align = { blocks: [...blocks].sort((a, b) => a - b), tool: "realign-lxx-french" };
  // Écriture atomique : tmp + rename, pour qu'une interruption ne laisse jamais
  // un fr.json à moitié écrit.
  if (APPLY) {
    const tmp = frPath + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(fr));
    fs.renameSync(tmp, frPath);
  }
  console.log(`${id} ${APPLY ? "[APPLIED]" : "[dry]"}: ${Object.keys(spec.chapters).length} chapitres traités, blocks restants ${[...blocks].length}`);
}

console.log(`\n${APPLY ? "[APPLIED]" : "[dry-run]"} ${touchedChapters} chapitres réappariés, ${spills} débordements, ${warnings} avertissements`);
