// Nettoie les notes de bas de page Giguet qui ont fui dans fr.json lors de
// l'extraction Wikisource. Le marqueur « ↑ » (lien retour Wikisource) n'apparaît
// jamais dans le texte biblique : on tronque chaque verset au premier « ↑ », et
// si rien de réel ne précède, on supprime la clé (note pure).
//
//   node scripts/clean-lxx-footnotes.mjs            (dry-run + audit)
//   node scripts/clean-lxx-footnotes.mjs --apply    (réécrit fr.json)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const APPLY = process.argv.includes("--apply");
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "public/lxx");
const MARK = "↑";

const books = fs.readdirSync(ROOT).filter((d) => fs.statSync(path.join(ROOT, d)).isDirectory());
let cleaned = 0,
  removed = 0;
const audit = [];

for (const id of books) {
  const p = path.join(ROOT, id, "fr.json");
  if (!fs.existsSync(p)) continue;
  const fr = JSON.parse(fs.readFileSync(p, "utf8"));
  let touched = false;
  for (const ch of Object.keys(fr)) {
    if (ch === "_align") continue;
    for (const v of Object.keys(fr[ch])) {
      const text = String(fr[ch][v]);
      if (!text.includes(MARK)) continue;
      const kept = text.slice(0, text.indexOf(MARK)).trim();
      if (kept.length === 0) {
        delete fr[ch][v];
        removed++;
        audit.push({ id, ref: `${ch}:${v}`, action: "removed", was: text.slice(0, 80) });
      } else {
        fr[ch][v] = kept;
        cleaned++;
        audit.push({ id, ref: `${ch}:${v}`, action: "trimmed", note: text.slice(text.indexOf(MARK), text.indexOf(MARK) + 60) });
      }
      touched = true;
    }
  }
  if (touched && APPLY) fs.writeFileSync(p, JSON.stringify(fr));
}

for (const a of audit) console.log(`${a.action.padEnd(7)} ${a.id} ${a.ref}  ${a.was || a.note}`);
console.log(`\n${APPLY ? "[APPLIED]" : "[dry-run]"} trimmed ${cleaned} verses, removed ${removed} pure-footnote keys`);
