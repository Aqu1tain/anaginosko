import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";

// Rattache aux lemmes sans glose une notice du Bailly déjà présente dans
// public/bailly, quand sa vedette ne diffère que par la forme contracte ou les
// terminaisons (« ὅλος, ὅλη, ὅλον », « χαριτόω-ῶ »). Hors ligne : api.bailly.app
// n'est pas interrogé. Un lemme n'est rattaché que si une seule notice convient.
//
//   node scripts/link-local-bailly-glosses.mjs           (aperçu)
//   node scripts/link-local-bailly-glosses.mjs --apply   (écrit glosses.json)

const root = path.resolve(new URL("..", import.meta.url).pathname);
const pub = (...p) => path.join(root, "public", ...p);
const APPLY = process.argv.includes("--apply");

const baseHeadword = (word) => word.normalize("NFC").split(/[,\s-]/)[0].trim();
const text = (html) => html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const excerptOf = (notice) => {
  const full = notice.senses.map((s) => text(s.html)).join(" ");
  if (full.length <= 150) return full;
  return `${full.slice(0, 150).replace(/\s+\S*$/, "")}…`;
};

const byHeadword = new Map();
for (const file of readdirSync(pub("bailly"))) {
  const notice = JSON.parse(readFileSync(pub("bailly", file), "utf8"));
  if (!notice.word) continue;
  const key = baseHeadword(notice.word);
  byHeadword.set(key, [...(byHeadword.get(key) ?? []), notice]);
}

for (const corpus of ["nt", "lxx"]) {
  const glossFile = pub(corpus, "glosses.json");
  const glosses = JSON.parse(readFileSync(glossFile, "utf8"));
  const lemmas = JSON.parse(readFileSync(pub(corpus, "lemmas.json"), "utf8"));
  const added = [];
  for (const { lemma } of lemmas) {
    if (glosses[lemma]) continue;
    const notices = byHeadword.get(lemma.normalize("NFC")) ?? [];
    if (notices.length !== 1) continue;
    const [notice] = notices;
    glosses[lemma] = { excerpt: excerptOf(notice), uri: notice.uri, headword: lemma };
    added.push(lemma);
  }
  console.log(`${corpus} : ${added.length} glose(s) rattachée(s) ${added.join(" ")}`);
  if (APPLY && added.length) writeFileSync(glossFile, JSON.stringify(glosses));
}
