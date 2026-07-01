// Modèle de LIENS pour l'arbitrage. Un lien = un verset grec (Rahlfs, autorité) ->
// suite ordonnée de versets Giguet source (0 = orphelin honnête, 1 = paire, 2+ =
// scission ; plusieurs grecs -> un français = fusion). On ne touche jamais au texte
// Giguet : on pointe dessus (data/giguet-lxx.json, numérotation Giguet d'origine).
//
// Ce script :
//  1. reconstruit les liens AUTO en rapprochant le fr.json matérialisé actuel du
//     Giguet immuable (texte identique -> on retrouve la source, même déplacée) ;
//  2. émet une FILE d'arbitrage priorisée des vrais cas de jugement.
//
//   node scripts/build-links.mjs   -> data/lxx-links.json, data/lxx-queue.json

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LXX = path.join(repo, "public/lxx");
const giguet = JSON.parse(fs.readFileSync(path.join(repo, "data/giguet-lxx.json"), "utf8"));

const norm = (s) => String(s).normalize("NFC").replace(/\s+/g, " ").trim();
const books = JSON.parse(fs.readFileSync(path.join(LXX, "books.json"), "utf8"));
const list = Array.isArray(books) ? books : books.books || Object.values(books);

// Index texte Giguet -> [{ch,v}] par livre (pour retrouver une source par le texte).
function giguetIndex(id) {
  const idx = new Map();
  const g = giguet[id] || {};
  for (const ch of Object.keys(g)) for (const v of Object.keys(g[ch])) {
    const k = norm(g[ch][v]);
    if (!idx.has(k)) idx.set(k, []);
    idx.get(k).push({ ch: Number(ch), v: Number(v) });
  }
  return idx;
}

const links = {}; // id -> { "<gCh>:<gV>": [[gigCh,gigV],...] }
const queue = [];
let matched = 0,
  unmatched = 0;

for (const b of list) {
  const id = b.id;
  if (!id) continue;
  const frPath = path.join(LXX, id, "fr.json");
  if (!fs.existsSync(frPath)) continue;
  const fr = JSON.parse(fs.readFileSync(frPath, "utf8"));
  const blocks = new Set((fr._align?.blocks || []).map(Number));
  const idx = giguetIndex(id);
  const gAll = giguet[id] || {};
  links[id] = {};

  for (const gCh of Object.keys(fr)) {
    if (gCh === "_align") continue;
    const greekPath = path.join(LXX, id, `${gCh}.json`);
    if (!fs.existsSync(greekPath)) continue;

    for (const gV of Object.keys(fr[gCh])) {
      const text = norm(fr[gCh][gV]);
      const key = `${gCh}:${gV}`;
      // Correspondance exacte (paire ou déplacement simple).
      const exact = idx.get(text);
      if (exact && exact.length === 1) {
        links[id][key] = [[exact[0].ch, exact[0].v]];
        matched++;
        continue;
      }
      if (exact && exact.length > 1) {
        // texte identique à plusieurs versets Giguet : ambigu -> lien du 1er, à revoir
        links[id][key] = [[exact[0].ch, exact[0].v]];
        matched++;
        continue;
      }
      // Concaténation (scission rejointe) : texte = giguet[a] + " " + giguet[b]...
      const parts = matchConcat(text, gAll);
      if (parts) {
        links[id][key] = parts.map((p) => [p.ch, p.v]);
        matched++;
        continue;
      }
      unmatched++;
      links[id][key] = null; // non reconstruit -> à arbitrer
    }
  }

  // File : chapitres bloqués (aucun lien) = arbitrage complet requis.
  for (const ch of blocks) {
    queue.push({
      book: id,
      ref: `${ch}:*`,
      kind: "blocked-chapter",
      priority: priorityFor(b, "blocked-chapter"),
      reason: `Chapitre ${ch} non apparié (réordonnancement/versification) — lier verset par verset`,
      canon: b.canon,
    });
  }
}

// Divergences connues de la zone Siracide (lecteurs indépendants en désaccord).
// Priorité maximale : la décision de Biblion tranche.
const ZONE_DIVERGENCES = [
  {
    book: "sir", ref: "33:28", kind: "reader-divergence",
    greek: "ἔμβαλε αὐτὸν εἰς ἐργασίαν ἵνα μὴ ἀργῇ πολλὴν γὰρ κακίαν ἐδίδαξεν ἡ ἀργία",
    proposals: [
      { reader: "H1a", sources: [["30", "42"]] },
      { reader: "H1b", sources: [["30", "41"], ["30", "42"]] },
    ],
    reason: "Frontière de fusion : Giguet 30:41 (« mets-le à l'ouvrage ») va-t-il avec 33:27 ou 33:28 ?",
  },
  {
    book: "sir", ref: "36:16", kind: "reader-divergence",
    greek: "εἰσάκουσον κύριε δεήσεως τῶν ἱκετῶν σου κατὰ τὴν εὐλογίαν Ααρων περὶ τοῦ λαοῦ σου",
    proposals: [
      { reader: "H2a", sources: [["36", "22"]] },
      { reader: "H2b", sources: [["36", "21"]] },
    ],
    reason: "Chevauchement : « exauce les suppliants » (F36:21) et « bénédiction d'Aaron » (F36:22) — deux moitiés du même verset grec.",
  },
  {
    book: "sir", ref: "33:16", kind: "orphan-vs-split",
    greek: "κἀγὼ ἔσχατος ἠγρύπνησα ὡς καλαμώμενος ὀπίσω τρυγητῶν",
    proposals: [
      { reader: "H1a", sources: [["30", "29"]], orphan: [["36", "16"]] },
      { reader: "H1b", sources: [["30", "29"], ["36", "16"]] },
    ],
    reason: "Doublet : Giguet traduit deux fois (F30:29 grappilleur + F36:16 « veillé le dernier ») — fusionner les deux, ou garder l'un et orphéliser l'autre ?",
  },
];
for (const d of ZONE_DIVERGENCES) queue.push({ ...d, priority: d.kind === "reader-divergence" ? 1 : 2, canon: "deutero" });

// Tri de la file : divergence lecteurs (1) > orphelin/scission (2) > basse confiance
// (3) > coutures canoniques (bonus). Puis par livre/chapitre.
const CANON_SEAM = new Set(["1es", "esd", "neh"]);
for (const q of queue) if (CANON_SEAM.has(q.book)) q.priority = Math.min(q.priority, 1.5);
queue.sort((a, b) => a.priority - b.priority || a.book.localeCompare(b.book));

function matchConcat(text, gAll) {
  // Essaie text = v1 + " " + v2 (+ " " + v3) sur des versets du même chapitre.
  for (const ch of Object.keys(gAll)) {
    const vs = Object.keys(gAll[ch]).map(Number).sort((a, b) => a - b);
    for (let i = 0; i < vs.length; i++) {
      let acc = norm(gAll[ch][vs[i]]);
      if (!text.startsWith(acc)) continue;
      if (acc === text) return [{ ch: Number(ch), v: vs[i] }];
      const chain = [{ ch: Number(ch), v: vs[i] }];
      for (let j = i + 1; j < vs.length && j < i + 4; j++) {
        acc = norm(acc + " " + gAll[ch][vs[j]]);
        chain.push({ ch: Number(ch), v: vs[j] });
        if (acc === text) return chain;
        if (!text.startsWith(acc)) break;
      }
    }
  }
  return null;
}

function priorityFor(book, kind) {
  if (kind === "blocked-chapter") return book.canon === "deutero" ? 3 : book.canon === "extra" ? 3.5 : 3.2;
  return 3;
}

const dest = path.join(repo, "data");
fs.writeFileSync(path.join(dest, "lxx-links.json"), JSON.stringify(links));
fs.writeFileSync(path.join(dest, "lxx-queue.json"), JSON.stringify(queue, null, 2));
console.log(`Liens reconstruits : ${matched} appariés, ${unmatched} non reconstruits (à arbitrer).`);
console.log(`File d'arbitrage : ${queue.length} items (${queue.filter((q) => q.kind === "reader-divergence").length} divergences, ${queue.filter((q) => q.kind === "orphan-vs-split").length} orphelin/scission, ${queue.filter((q) => q.kind === "blocked-chapter").length} chapitres bloqués).`);
