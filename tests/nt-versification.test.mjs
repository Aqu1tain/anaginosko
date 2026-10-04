// Versification NT (KAN-86) : chaque verset grec des chapitres recalés reçoit son
// français, et l'application de la table est idempotente.
//   node tests/nt-versification.test.mjs
import { readFileSync } from "node:fs";
import { applyVersification, versificationTable } from "../scripts/lib/nt-versification.mjs";

const read = (p) => JSON.parse(readFileSync(new URL(`../public/nt/${p}`, import.meta.url), "utf8"));
const greekVerses = (book, ch) => [...new Set(read(`${book}/${ch}.json`).mots.map((m) => m.verse))];

const table = versificationTable();
const checks = [];
for (const book of Object.keys(table).filter((k) => !k.startsWith("_"))) {
  const fr = read(`${book}/fr.json`);
  checks.push([`${book} : table déjà appliquée et idempotente`, JSON.stringify(applyVersification(book, structuredClone(fr), table)) === JSON.stringify(fr)]);
  for (const ch of Object.keys(table[book])) {
    const missing = greekVerses(book, ch).filter((v) => !fr[ch]?.[v]);
    checks.push([`${book} ${ch} : tout verset grec a son français${missing.length ? ` (manque ${missing})` : ""}`, missing.length === 0]);
  }
}
const mt17 = read("mt/fr.json")["17"];
checks.push(["Mt 17,15 commence par la supplique", mt17["15"].startsWith("il lui dit")]);
checks.push(["Mt 17,27 réunit le statère et « Prends-le »", mt17["27"].includes("statère") && mt17["27"].includes("Prends-le")]);
checks.push(["Mc 8,39 (doublon de 9,1) retiré", read("mk/fr.json")["8"]["39"] === undefined]);

const failed = checks.filter(([, ok]) => !ok);
for (const [name] of failed) console.error(`ECHEC: ${name}`);
if (failed.length) process.exit(1);
console.log(`OK : ${checks.length} contrôles de versification NT.`);
