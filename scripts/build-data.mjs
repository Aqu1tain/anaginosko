// Normalizes the two source datasets into src/data/texts.json.
// Run: node scripts/build-data.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(resolve(root, p), "utf8"));

const passages = read("data-sources/passages.json");

const collections = [
  {
    id: "passages",
    title: "Passages",
    subtitle: "Lecture suivie, prononciation érasmienne et restituée",
  },
];

const passageTexts = passages.textes.map((t) => ({
  id: `passages-${t.id}`,
  collection: "passages",
  niveau: t.niveau,
  reference: t.reference,
  grec: t.grec,
  translitErasmien: t.erasmien_continu || null,
  translitRestituee: t.restituee_continu || null,
  mots: (t.mots || []).map((m) => ({
    grec: m.grec,
    erasmien: m.erasmien,
    restituee: m.restituee,
  })),
}));

const out = {
  generatedFrom: ["data-sources/passages.json"],
  collections,
  texts: passageTexts,
};

const dest = resolve(root, "src/data/texts.json");
writeFileSync(dest, JSON.stringify(out, null, 2) + "\n", "utf8");
console.log(`Wrote ${out.texts.length} passages to src/data/texts.json`);
