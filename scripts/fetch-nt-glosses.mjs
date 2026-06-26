// Récupère une glose française par lemme (Bailly 2020, api.bailly.app) pour TOUS
// les lemmes du NT. Écrit public/nt/glosses.json = { lemme: { excerpt, uri } }.
// CC BY-NC-ND : extraits verbatim, usage non commercial, attribution (mentions).
// Run: node scripts/fetch-nt-glosses.mjs
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { pickEntry } from "./lib/bailly-pick.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ntDir = resolve(root, "public/nt");
const out = resolve(ntDir, "glosses.json");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const lemmas = JSON.parse(readFileSync(resolve(ntDir, "lemmas.json"), "utf8")).map((e) => e.lemma);

// Reprise possible : on repart de l'existant.
const glosses = existsSync(out) ? JSON.parse(readFileSync(out, "utf8")) : {};

let ok = 0, missing = 0, done = 0;
for (let i = 0; i < lemmas.length; i++) {
  const lemma = lemmas[i];
  if (glosses[lemma]) { ok++; continue; }
  try {
    const res = await fetch(`https://api.bailly.app/lookup/${encodeURIComponent(lemma)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const entries = json.data?.entries ?? [];
    const e = entries.length ? pickEntry(entries, lemma) : null;
    if (e?.excerpt) { glosses[lemma] = { excerpt: e.excerpt.trim(), uri: e.uri }; ok++; }
    else missing++;
    done++;
  } catch {
    missing++;
  }
  if (i % 200 === 0) {
    writeFileSync(out, JSON.stringify(glosses)); // sauvegarde incrémentale
    console.log(`… ${i}/${lemmas.length} (${ok} gloses, ${missing} manquants)`);
  }
  await sleep(120);
}

writeFileSync(out, JSON.stringify(glosses));
console.log(`\nTerminé : ${ok} gloses sur ${lemmas.length} lemmes (${missing} manquants).`);
