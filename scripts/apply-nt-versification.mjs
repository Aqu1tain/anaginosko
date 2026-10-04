// Applique data/nt-versification.json aux public/nt/<livre>/fr.json versionnés.
// Run: node scripts/apply-nt-versification.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { applyVersification, versificationTable } from "./lib/nt-versification.mjs";

const ntDir = resolve(dirname(fileURLToPath(import.meta.url)), "../public/nt");
const table = versificationTable();

for (const bookId of Object.keys(table).filter((k) => !k.startsWith("_"))) {
  const file = resolve(ntDir, bookId, "fr.json");
  const before = readFileSync(file, "utf8");
  const after = JSON.stringify(applyVersification(bookId, JSON.parse(before), table));
  if (after === before) { console.log(`${bookId} : déjà à jour`); continue; }
  writeFileSync(file, after);
  console.log(`${bookId} : chapitres ${Object.keys(table[bookId]).join(", ")} recalés`);
}
