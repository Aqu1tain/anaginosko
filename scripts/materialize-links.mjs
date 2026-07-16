// Matérialise les liens en fr.json (clé = verset grec) que le lecteur consomme.
// Source de vérité = Giguet immuable (data/giguet-lxx.json) + liens auto
// (data/lxx-links.json) + overrides Biblion (data/lxx-arbitration.json, gagnent).
// Rejoué à CHAQUE build : un build n'efface jamais le jugement de Biblion.
//
// Garanties : (1) zéro-perte AU MOT - chaque mot Giguet servi exactement une fois
// (dans un lien ou en orphelin) ; refus d'écrire sinon. (2) Les liens ne pointent
// que sur des versets Giguet existants. (3) Verset grec sans lien -> grec seul.
// Matérialisation par-ref = module partagé lib/lxx-materialize.mjs (identique au
// runtime lib/arbitration.ts et à apply-overrides : un seul instrument).
//
//   node scripts/materialize-links.mjs            (dry-run + vérif zéro-perte)
//   node scripts/materialize-links.mjs --apply    (réécrit public/lxx/*/fr.json)
//   node scripts/materialize-links.mjs --check     (compare au fr.json actuel)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { materializeSources, materializeEntry, isMarkerSegment, markerReason } from "../lib/lxx-materialize.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// LXX_DATA_DIR / ARB_DIR : au déploiement, on sert depuis le volume serveur et on
// lit l'arbitrage VIVANT de Biblion (ARB_DIR), comme apply-overrides. En local, defaults repo.
const LXX = process.env.LXX_DATA_DIR || path.join(repo, "public/lxx");
const ARB_DIR = process.env.ARB_DIR || path.join(repo, "data");
const APPLY = process.argv.includes("--apply");
const CHECK = process.argv.includes("--check");
const OUTDIR = process.env.MATERIALIZE_OUT; // écrit la matérialisation ailleurs (validation), sans toucher au repo

const giguet = JSON.parse(fs.readFileSync(path.join(repo, "data/giguet-lxx.json"), "utf8"));
const autoLinks = JSON.parse(fs.readFileSync(path.join(repo, "data/lxx-links.json"), "utf8"));
const ovPath = path.join(ARB_DIR, "lxx-arbitration.json");
const overrides = fs.existsSync(ovPath) ? JSON.parse(fs.readFileSync(ovPath, "utf8")) : {};

// Chevauchements auto pré-existants (bug build-links, servis en double sur préprod) :
// allowlist stricte de refs nommées, versionnée. Toute AUTRE violation reste fatale.
const gapsPath = path.join(repo, "data/lxx-arbitration-gaps.json");
const gaps = fs.existsSync(gapsPath) ? JSON.parse(fs.readFileSync(gapsPath, "utf8")) : {};
const OVERLAP_ALLOW = new Set((gaps.auto_overlaps_phase2 || []).map((o) => `${o.book} ${o.giguet}`));

const greekVerses = (id, ch) => {
  const p = path.join(LXX, id, `${ch}.json`);
  if (!fs.existsSync(p)) return null;
  return [...new Set(JSON.parse(fs.readFileSync(p, "utf8")).mots.map((m) => m.verse).filter((v) => v != null))].sort((a, b) => a - b);
};

let violations = 0,
  diffs = 0,
  books_done = 0;
const residual = []; // { book, ref, current, materialized } — refs où fr.json diffère de la matérialisation
const excluded = []; // segments Giguet exclus du servi (marqueur / ponctuation), refs nommées

for (const id of Object.keys(giguet)) {
  const frPath = path.join(LXX, id, "fr.json");
  if (!fs.existsSync(frPath)) continue;
  const current = JSON.parse(fs.readFileSync(frPath, "utf8"));
  const auto = autoLinks[id] || {};
  const ov = overrides[id] || {};
  const gAll = giguet[id];

  const out = {}; // gCh -> {gV -> text}
  const maisonBy = {}; // "gCh:gV" -> traducteur (crédit des traductions maison, servi au lecteur)
  const greekChapters = new Set(
    Object.keys(current).filter((k) => k !== "_align")
      .concat(Object.keys(auto).map((k) => k.split(":")[0]))
      .concat(Object.keys(ov).map((k) => k.split(":")[0])),
  );

  // Lien effectif par ref grec : override (Biblion) > auto ; null = grec seul.
  const effSources = (ref) => (ov[ref] ? ov[ref].sources : auto[ref] ?? null);

  // 1) Versets grecs liés : texte matérialisé via le module par-ref partagé (gère
  //    les extraits de mots, identique au runtime).
  for (const gCh of greekChapters) {
    const gvs = greekVerses(id, gCh);
    if (!gvs) continue;
    out[gCh] = out[gCh] || {};
    for (const gV of gvs) {
      const ref = `${gCh}:${gV}`;
      // Override maison (texte libre) servi tel quel ; sinon sources Giguet ; null = grec seul.
      if (ov[ref]?.maison) { const t = ov[ref].maison.trim(); if (t) { out[gCh][gV] = t; if (ov[ref].by) maisonBy[ref] = ov[ref].by; } continue; }
      const src = effSources(ref);
      if (src == null) continue; // grec seul
      const text = materializeSources(gAll, src);
      if (text) out[gCh][gV] = text;
    }
  }

  // 2) Zéro-perte AU MOT : plages de mots revendiquées par verset Giguet (liens
  //    effectifs) ; toute plage NON couverte est ré-émise en orphelin (ligne sans
  //    grec) au chapitre grec « maison ». Le chevauchement = violation.
  const MAXI = Number.MAX_SAFE_INTEGER;
  const claims = new Map(); // "c:v" -> [[de, à], ...]
  const addClaim = (s) => {
    const k = `${s[0]}:${s[1]}`;
    if (!claims.has(k)) claims.set(k, []);
    claims.get(k).push(s.length === 4 ? [s[2], s[3]] : [0, MAXI]);
  };
  for (const ref of Object.keys(auto)) if (!ov[ref] && Array.isArray(auto[ref])) auto[ref].forEach(addClaim);
  for (const ref of Object.keys(ov)) ov[ref].sources.forEach(addClaim);

  // Place une plage non couverte : contenu -> orphelin (ligne sans grec) ; segment
  // entièrement non-contenu (marqueurs/ponctuation) -> exclu, raison nommée.
  const placeOrphan = (gigCh, gigV, words, f, t) => {
    const text = words.slice(f, t + 1).join(" ");
    if (isMarkerSegment(text)) {
      excluded.push({ book: id, giguet: `${gigCh}:${gigV}`, words: `${f + 1}-${t + 1}`, text, reason: markerReason(text) });
      return;
    }
    const home = homeChapter(auto, ov, gigCh) ?? gigCh;
    out[home] = out[home] || {};
    const gvs = greekVerses(id, home) || [0];
    const slot = Math.max(...gvs, ...Object.keys(out[home]).map(Number)) + 1;
    out[home][slot] = text;
  };
  for (const gigCh of Object.keys(gAll)) {
    for (const gigV of Object.keys(gAll[gigCh])) {
      const words = gAll[gigCh][gigV].split(/\s+/).filter(Boolean);
      const spans = (claims.get(`${gigCh}:${gigV}`) || []).slice().sort((a, b) => a[0] - b[0]);
      let cursor = 0;
      for (const [f, t] of spans) {
        if (f < cursor) {
          const known = OVERLAP_ALLOW.has(`${id} ${gigCh}:${gigV}`);
          console.warn(`  ${known ? "(connu)" : "!"} ${id} ${gigCh}:${gigV}: chevauchement de mots (zéro-perte)${known ? " [allowlist auto_overlaps]" : ""}`);
          if (!known) violations++;
        } else if (f > cursor) placeOrphan(gigCh, gigV, words, cursor, f - 1);
        cursor = Math.max(cursor, t + 1);
      }
      if (cursor < words.length) placeOrphan(gigCh, gigV, words, cursor, words.length - 1);
    }
  }

  if (CHECK) {
    for (const gCh of Object.keys(out)) {
      for (const gV of Object.keys(out[gCh])) {
        const now = current[gCh]?.[gV];
        if (now != null && norm(now) !== norm(out[gCh][gV])) {
          diffs++;
          residual.push({ book: id, ref: `${gCh}:${gV}`, current: now, materialized: out[gCh][gV] });
        }
      }
    }
  }

  out._align = current._align;
  if (Object.keys(maisonBy).length) out._maison = maisonBy; // crédits des traductions maison
  if ((APPLY || OUTDIR) && !violations) {
    const target = OUTDIR ? path.join(OUTDIR, id, "fr.json") : frPath;
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const tmp = target + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(out));
    fs.renameSync(tmp, target);
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
if (CHECK && process.env.RESIDUAL_OUT) {
  fs.writeFileSync(process.env.RESIDUAL_OUT, JSON.stringify(residual, null, 1));
  console.log(`  résidu détaillé -> ${process.env.RESIDUAL_OUT} (${residual.length} refs)`);
}
if (process.env.EXCLUSIONS_OUT) {
  fs.writeFileSync(process.env.EXCLUSIONS_OUT, JSON.stringify(excluded, null, 1));
  console.log(`  exclusions nommées (marqueurs/ponctuation) -> ${process.env.EXCLUSIONS_OUT} (${excluded.length} segments)`);
}
if (violations) process.exit(1);
