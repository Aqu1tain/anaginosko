import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Applique data/nt-morph-overrides.json aux chapitres du NT déjà bâtis. Appelé à la
// fin de build-nt.mjs ; relançable seul (idempotent).
//   node scripts/apply-nt-morph-overrides.mjs

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const NFC = (s) => (s ?? "").normalize("NFC").replace(/[.,;·]/g, "");

export function applyNtMorphOverrides(outDir = path.join(root, "public/nt")) {
  const { rules } = JSON.parse(readFileSync(path.join(root, "data/nt-morph-overrides.json"), "utf8"));
  let applied = 0;
  for (const rule of rules) {
    const [book, ch, v] = rule.ref.split(":");
    const file = path.join(outDir, book, `${ch}.json`);
    if (!existsSync(file)) throw new Error(`chapitre introuvable pour ${rule.ref}`);
    const data = JSON.parse(readFileSync(file, "utf8"));
    const word = data.mots.find((m) => m.verse === Number(v) && NFC(m.grec) === NFC(rule.form));
    if (!word) throw new Error(`forme ${rule.form} introuvable en ${rule.ref}`);
    if (word.morph === rule.morph) continue;
    word.morph = rule.morph;
    writeFileSync(file, JSON.stringify(data));
    applied++;
  }
  return applied;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(`${applyNtMorphOverrides()} analyse(s) corrigée(s)`);
}
