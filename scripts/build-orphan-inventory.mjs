// Inventaire de la passe « zéro orphelin » : tout ce qui reste sans vis-à-vis,
// dans un sens ou dans l'autre, avec le contexte nécessaire pour trancher :
//  - les items de la file d'arbitrage (divergences, orphelin-vs-scission…) ;
//  - les versets grecs orphelins (lien []) ou non liés (null) — surtout les
//    « fusion : couvert par F x:y », désormais résolubles par EXTRAITS ;
//  - les versets Giguet (ou restes de mots) non consommés par aucun lien.
// Chaque item porte le grec, les liens voisins, et les versets Giguet candidats
// PRÉ-TOKENISÉS avec indices (0-based) pour des extraits sans erreur de borne.
//
//   node scripts/build-orphan-inventory.mjs   -> /private/tmp/realign4/inventory.json

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LXX = path.join(repo, "public/lxx");
const OUT = process.env.OUT_DIR || "/private/tmp/realign4";

const giguet = JSON.parse(fs.readFileSync(path.join(repo, "data/giguet-lxx.json"), "utf8"));
const links = JSON.parse(fs.readFileSync(path.join(repo, "data/lxx-links.json"), "utf8"));
const queue = JSON.parse(fs.readFileSync(path.join(repo, "data/lxx-queue.json"), "utf8"));

const words = (b, c, v) => {
  const t = giguet[b]?.[String(c)]?.[String(v)];
  return t == null ? null : t.split(/\s+/).filter(Boolean);
};
const spanOf = (s) => (s.length === 4 ? [s[2], s[3]] : [0, Number.MAX_SAFE_INTEGER]);

const greekText = (b, ch, v) => {
  const p = path.join(LXX, b, `${ch}.json`);
  if (!fs.existsSync(p)) return null;
  const mots = JSON.parse(fs.readFileSync(p, "utf8")).mots || [];
  return mots.filter((m) => m.verse === v).map((m) => m.grec).join(" ") || null;
};
const greekVerseNums = (b, ch) => {
  const p = path.join(LXX, b, `${ch}.json`);
  if (!fs.existsSync(p)) return [];
  return [...new Set(JSON.parse(fs.readFileSync(p, "utf8")).mots.map((m) => m.verse).filter((v) => v != null))].sort((a, b2) => a - b2);
};

// Revendications par verset Giguet (liens auto uniquement — pas d'overrides en jeu ici).
function claimsFor(book) {
  const m = new Map();
  for (const [ref, src] of Object.entries(links[book] || {})) {
    if (!Array.isArray(src)) continue;
    for (const s of src) {
      const k = `${s[0]}:${s[1]}`;
      if (!m.has(k)) m.set(k, []);
      m.get(k).push({ ref, span: spanOf(s) });
    }
  }
  return m;
}

const inventory = {}; // book -> issues[]
const add = (book, issue) => {
  (inventory[book] = inventory[book] || []).push(issue);
};

// Contexte : versets Giguet tokenisés autour d'un point (pour extraits fiables).
const tokenized = (book, ch, vs) => {
  const out = {};
  for (const v of vs) {
    const w = words(book, ch, v);
    if (w) out[`${ch}:${v}`] = w.map((x, i) => `${i}:${x}`).join(" ");
  }
  return out;
};

// 1) Items de file (sauf ceux des chapitres additions est/dan — KAN-55).
for (const it of queue) {
  add(it.book, {
    kind: it.kind, ref: it.ref, reason: it.reason, proposals: it.proposals,
    greek: it.greek ?? (() => { const [c, v] = it.ref.split(":").map(Number); return greekText(it.book, c, v); })(),
  });
}

// 2) Versets grecs orphelins ([]) ou non liés (null).
for (const book of Object.keys(links)) {
  for (const [ref, src] of Object.entries(links[book])) {
    if (src === null) add(book, { kind: "greek-unlinked", ref, greek: (() => { const [c, v] = ref.split(":").map(Number); return greekText(book, c, v); })() });
    else if (Array.isArray(src) && src.length === 0) {
      const [c, v] = ref.split(":").map(Number);
      add(book, { kind: "greek-orphan", ref, greek: greekText(book, c, v) });
    }
  }
}

// 3) Versets Giguet non consommés (entiers) — trous côté français.
for (const book of Object.keys(giguet)) {
  const claims = claimsFor(book);
  for (const ch of Object.keys(giguet[book])) {
    for (const v of Object.keys(giguet[book][ch])) {
      if (!claims.has(`${ch}:${v}`)) {
        add(book, { kind: "french-unclaimed", giguet: `${ch}:${v}`, text: giguet[book][ch][v] });
      }
    }
  }
}

// Enrichissement : pour chaque issue, joindre le contexte (liens voisins + Giguet
// tokenisé autour).
for (const book of Object.keys(inventory)) {
  for (const issue of inventory[book]) {
    const [c, v] = (issue.ref || issue.giguet).split(":").map(Number);
    const around = [];
    for (let d = -2; d <= 2; d++) if (v + d >= 1) around.push(v + d);
    issue.giguetContext = tokenized(book, c, around);
    if (issue.ref) {
      issue.neighborLinks = {};
      for (let d = -2; d <= 2; d++) {
        const r = `${c}:${v + d}`;
        if (links[book]?.[r] !== undefined) issue.neighborLinks[r] = links[book][r];
      }
    }
  }
}

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "inventory.json"), JSON.stringify(inventory, null, 1));
let total = 0;
for (const book of Object.keys(inventory).sort()) {
  const byKind = {};
  for (const i of inventory[book]) byKind[i.kind] = (byKind[i.kind] || 0) + 1;
  total += inventory[book].length;
  console.log(`${book}: ${inventory[book].length} — ${JSON.stringify(byKind)}`);
}
console.log(`TOTAL: ${total} issues -> ${path.join(OUT, "inventory.json")}`);
