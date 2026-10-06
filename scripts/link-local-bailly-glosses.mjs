import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";

// Rattache aux lemmes sans glose vérifiable une notice du Bailly déjà présente dans
// public/bailly : vedette à la forme contracte ou avec ses terminaisons (« ὅλος, ὅλη,
// ὅλον », « χαριτόω-ῶ »), actif d'un verbe moyen (ἐκλέγομαι, rangé à ἐκλέγω),
// graphie attique (ἐπιγίνομαι, rangé à ἐπιγίγνομαι). Mêmes règles que
// src/data/glosses.ts. Hors ligne : api.bailly.app n'est pas interrogé. Un lemme
// n'est rattaché que si une seule notice convient.
//
//   node scripts/link-local-bailly-glosses.mjs           (aperçu)
//   node scripts/link-local-bailly-glosses.mjs --apply   (écrit glosses.json)

const root = path.resolve(new URL("..", import.meta.url).pathname);
const pub = (...p) => path.join(root, "public", ...p);
const APPLY = process.argv.includes("--apply");

const key = (word) =>
  word.normalize("NFC").replace(/ϐ/g, "β").replace(/[··]/g, "").replace(/^\*/, "").normalize("NFD").replace(/\u0345/g, "").normalize("NFC");
const baseHeadword = (word) => key(word.split(/[,\s-]/)[0].trim());
const candidates = (lemma) => {
  const l = lemma.normalize("NFC");
  return [...new Set([l, l.replace(/ομαι$/, "ω"), l.replace(/γίνομαι$/, "γίγνομαι")].map(key))];
};
const glossHeadword = (gloss) => (gloss.headword ? key(gloss.headword) : baseHeadword(gloss.excerpt));
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
    const forms = candidates(lemma);
    if (glosses[lemma] && forms.includes(glossHeadword(glosses[lemma]))) continue;
    const notices = [...new Set(forms.flatMap((f) => byHeadword.get(f) ?? []))];
    if (notices.length !== 1) continue;
    const [notice] = notices;
    glosses[lemma] = { excerpt: excerptOf(notice), uri: notice.uri, headword: baseHeadword(notice.word) };
    added.push(lemma);
  }
  console.log(`${corpus} : ${added.length} glose(s) rattachée(s) ${added.join(" ")}`);
  if (APPLY && added.length) writeFileSync(glossFile, JSON.stringify(glosses));
}
