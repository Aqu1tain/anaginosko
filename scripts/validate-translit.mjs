// Valide le transliterateur contre les formes déjà translittérées (vérité terrain).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { grecToErasmien, grecToRestituee } from "./translit.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const d = JSON.parse(readFileSync(resolve(root, "data-sources/passages.json"), "utf8"));

let okE = 0, okR = 0, n = 0;
const missE = [], missR = [];
const seen = new Set();
for (const t of d.textes) {
  for (const m of t.mots) {
    if (seen.has(m.grec)) continue;
    seen.add(m.grec);
    n++;
    const e = grecToErasmien(m.grec);
    const r = grecToRestituee(m.grec);
    if (e === m.erasmien) okE++; else if (missE.length < 30) missE.push([m.grec, m.erasmien, e]);
    if (r === m.restituee) okR++; else if (missR.length < 30) missR.push([m.grec, m.restituee, r]);
  }
}
const pct = (x) => ((x / n) * 100).toFixed(1) + "%";
console.log(`Formes uniques : ${n}`);
console.log(`Érasmien  : ${okE}/${n} (${pct(okE)})`);
console.log(`Restituée : ${okR}/${n} (${pct(okR)})`);
console.log("\n-- écarts érasmien (grec | attendu | obtenu) --");
for (const [g, exp, got] of missE) console.log(`  ${g.padEnd(16)} ${exp.padEnd(16)} ${got}`);
console.log("\n-- écarts restituée --");
for (const [g, exp, got] of missR) console.log(`  ${g.padEnd(16)} ${exp.padEnd(16)} ${got}`);
