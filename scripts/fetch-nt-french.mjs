// Récupère la traduction française CATHOLIQUE (néo-Crampon libre) pour tout le
// NT et l'écrit par livre : public/nt/<id>/fr.json = { chapitre: { verset: texte } }.
// Source : bible.helloao.org (fra_ncl). À lancer APRÈS build-nt.mjs.
// Run: node scripts/fetch-nt-french.mjs
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ntDir = resolve(root, "public/nt");
const TRANSLATION = "fra_ncl";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const { books } = JSON.parse(readFileSync(resolve(ntDir, "books.json"), "utf8"));

const verseText = (verse) =>
  (verse.content || [])
    .map((c) => (typeof c === "string" ? c : (c && c.text) || ""))
    .join(" ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?·])/g, "$1")
    .trim();

let totalCh = 0, totalVerses = 0, fails = 0;

for (const b of books) {
  const out = {}; // chapitre -> { verset: texte }
  for (let ch = 1; ch <= b.chapters; ch++) {
    const url = `https://bible.helloao.org/api/${TRANSLATION}/${b.usfm}/${ch}.json`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const verses = {};
      for (const item of data.chapter?.content ?? []) {
        if (item && item.type === "verse") {
          const t = verseText(item);
          if (t) {
            verses[item.number] = t;
            totalVerses++;
          }
        }
      }
      out[ch] = verses;
      totalCh++;
    } catch (e) {
      fails++;
      console.warn(`⚠ ${b.id} ${ch}: ${e.message}`);
    }
    await sleep(40);
  }
  if (!existsSync(resolve(ntDir, b.id))) continue;
  writeFileSync(resolve(ntDir, b.id, "fr.json"), JSON.stringify(out));
  process.stdout.write(`${b.id} `);
}

console.log(`\n\n${totalCh} chapitres, ${totalVerses} versets (néo-Crampon), ${fails} échecs.`);
