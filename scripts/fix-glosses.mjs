// Recorrige les gloses mal aiguillées (homonymes : ὁ → la lettre Ο, etc.). On ne
// réinterroge que les gloses suspectes (vedette stockée ≠ lemme) et on remplace
// l'entrée par celle dont la vedette est exactement le lemme (cf. pickEntry).
// Run: node scripts/fix-glosses.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { pickEntry, isHeadMatch, headOfExcerpt, normHead } from "./lib/bailly-pick.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const lookupCache = new Map();
async function lookup(lemma) {
  if (lookupCache.has(lemma)) return lookupCache.get(lemma);
  const res = await fetch(`https://api.bailly.app/lookup/${encodeURIComponent(lemma)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const entries = (await res.json()).data?.entries ?? [];
  lookupCache.set(lemma, entries);
  await sleep(110);
  return entries;
}

async function repair(file, pretty) {
  const path = resolve(root, file);
  const glosses = JSON.parse(readFileSync(path, "utf8"));
  const suspects = Object.keys(glosses).filter(
    (lemma) => headOfExcerpt(glosses[lemma].excerpt) !== normHead(lemma),
  );
  console.log(`\n${file}: ${suspects.length} suspectes à vérifier`);

  // Politique sûre : on ne remplace QUE si une entrée porte exactement le lemme
  // (corrige les vrais homonymes : ὁ → la lettre Ο, etc.). Sinon on n'y touche
  // pas : une « suspecte » sans vedette exacte est souvent une glose correcte
  // sous une autre forme — déponent (πορεύομαι → vedette πορεύω), orthographe
  // koinè (ἐπιγινώσκω vs ἐπιγιγνώσκω), comparatif… qu'il ne faut pas détruire.
  let fixed = 0;
  let untouched = 0;
  const sample = [];
  for (let i = 0; i < suspects.length; i++) {
    const lemma = suspects[i];
    try {
      const entries = await lookup(lemma);
      const e = pickEntry(entries, lemma);
      if (isHeadMatch(e, lemma) && e.excerpt && e.excerpt.trim() !== glosses[lemma].excerpt) {
        if (sample.length < 30) sample.push(`${lemma} → ${e.excerpt.slice(0, 42)}`);
        glosses[lemma] = { excerpt: e.excerpt.trim(), uri: e.uri };
        fixed++;
      } else {
        untouched++;
      }
    } catch (err) {
      console.warn(`  ⚠ ${lemma}: ${err.message}`);
    }
    if (i % 100 === 0 && i) console.log(`  … ${i}/${suspects.length} (${fixed} corrigées)`);
  }

  writeFileSync(path, JSON.stringify(glosses, null, pretty ? 2 : 0) + (pretty ? "\n" : ""));
  console.log(`${file}: ${fixed} corrigées, ${untouched} laissées telles quelles.`);
  console.log(sample.map((s) => `  ✓ ${s}`).join("\n"));
}

await repair("src/data/glosses.json", true);
await repair("public/nt/glosses.json", false);
console.log("\nTerminé.");
