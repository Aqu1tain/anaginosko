import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const required = [
  "LICENSE",
  "DATA-LICENSES.md",
  "THIRD_PARTY_NOTICES.md",
  "licenses/fonts/OFL-1.1.txt",
  "app/confidentialite/page.tsx",
];
const errors = [];

for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) errors.push("Fichier légal manquant : " + file);
}

const assertions = [
  ["README.md", /néo-Crampon Libre[\s\S]*CC BY-SA 4\.0/i, "licence néo-Crampon absente"],
  ["README.md", /SBLGNT[\s\S]*CC BY 4\.0/i, "licence SBLGNT absente"],
  ["src/components/MentionsView.tsx", /contact@corentinrenard\.com/, "contact légal absent"],
  ["src/components/MentionsView.tsx", /CC BY-NC-SA 4\.0/, "licence LXX absente"],
  ["src/components/MentionsView.tsx", /traduction Anaginosko/, "droits des traductions Anaginosko absents"],
];

for (const [file, pattern, message] of assertions) {
  const body = fs.readFileSync(path.join(root, file), "utf8");
  if (!pattern.test(body)) errors.push(file + " : " + message);
}

const forbidden = [
  ["README.md", /néo-Crampon[^\n]*(?:domaine public|public domain)/i],
  ["LICENSE", /néo-Crampon[^\n]*(?:domaine public|public domain)/i],
  ["src/components/MentionsView.tsx", /néo-Crampon[^\n]*(?:domaine public|public domain)/i],
  ["scripts/build-data.mjs", /SBLGNT[^\n]*(?:domaine public|public domain)/i],
  ["src/data/texts.ts", /néo-Crampon[^\n]*(?:domaine public|public domain)/i],
];

for (const [file, pattern] of forbidden) {
  const body = fs.readFileSync(path.join(root, file), "utf8");
  if (pattern.test(body)) errors.push(file + " : ancienne affirmation de domaine public");
}

const arbitration = JSON.parse(
  fs.readFileSync(path.join(root, "data/lxx-arbitration.json"), "utf8"),
);
// Les signatures historiques et les identifiants nommés restent acceptés : leur
// migration relève d'une opération éditoriale séparée, avec sauvegarde du corpus vivant.
const allowedTranslators = new Set([
  "corentin-renard",
  "noah-jaubert",
  "Admin",
  "Βιβλίον",
]);
for (const [book, entries] of Object.entries(arbitration)) {
  if (book.startsWith("_") || !entries || typeof entries !== "object") continue;
  for (const [ref, entry] of Object.entries(entries)) {
    if (!entry || typeof entry !== "object" || !entry.maison) continue;
    if (!allowedTranslators.has(entry.by)) {
      errors.push("Traducteur local non normalisé : " + book + " " + ref + " (" + String(entry.by) + ")");
    }
  }
}

if (errors.length) {
  for (const error of errors) console.error("✗ " + error);
  process.exit(1);
}

console.log("✓ Registre légal, attributions et identifiants de traduction vérifiés.");
