// One-time fetch: récupère une glose française par lemme depuis api.bailly.app
// (Bailly 2020, CC BY-NC-ND : on stocke l'« excerpt » VERBATIM, sans modification,
// usage non commercial, avec attribution dans les mentions légales).
// Écrit src/data/glosses.json { lemme: { excerpt, uri } }. Pas de réseau au build.
// Run: node scripts/fetch-glosses.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { pickBestExcerpt, pickEntry } from "./lib/bailly-pick.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const data = JSON.parse(readFileSync(resolve(root, "src/data/texts.json"), "utf8"));
const lemmas = [
  ...new Set(data.texts.flatMap((t) => (t.mots ?? []).map((m) => m.lemme).filter(Boolean))),
].sort((a, b) => a.localeCompare(b, "el"));

const glosses = {};
let ok = 0;
let missing = 0;

async function resolveGloss(entry, lemma) {
  let best = pickBestExcerpt(entry, lemma);
  if (!best && entry?.uri) {
    const res = await fetch(`https://api.bailly.app/entry/${encodeURIComponent(entry.uri)}`);
    if (res.ok) best = pickBestExcerpt((await res.json()).data?.entry, lemma);
  }
  return best ? { excerpt: best.excerpt.trim(), uri: best.uri ?? entry.uri, headword: best.word } : null;
}

for (let i = 0; i < lemmas.length; i++) {
  const lemma = lemmas[i];
  try {
    const res = await fetch(`https://api.bailly.app/lookup/${encodeURIComponent(lemma)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const entries = json.data?.entries ?? [];
    const e = entries.length ? pickEntry(entries, lemma) : null;
    const gloss = await resolveGloss(e, lemma);
    if (gloss) {
      glosses[lemma] = gloss;
      ok++;
    } else {
      missing++;
    }
  } catch (err) {
    missing++;
    console.warn(`⚠ ${lemma}: ${err.message}`);
  }
  if (i % 50 === 0) console.log(`… ${i}/${lemmas.length} (${ok} ok, ${missing} manquants)`);
  await sleep(70);
}

writeFileSync(resolve(root, "src/data/glosses.json"), JSON.stringify(glosses, null, 2) + "\n", "utf8");
console.log(`\nÉcrit src/data/glosses.json : ${ok} gloses, ${missing} manquants sur ${lemmas.length} lemmes.`);
