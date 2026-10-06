import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { baseHeadword, candidates, excerptOf, noticesByHeadword, verifiedFor } from "./lib/bailly-headwords.mjs";

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

const byHeadword = noticesByHeadword(pub());

for (const corpus of ["nt", "lxx"]) {
  const glossFile = pub(corpus, "glosses.json");
  const glosses = JSON.parse(readFileSync(glossFile, "utf8"));
  const lemmas = JSON.parse(readFileSync(pub(corpus, "lemmas.json"), "utf8"));
  const added = [];
  for (const { lemma } of lemmas) {
    if (verifiedFor(lemma, glosses[lemma])) continue;
    const forms = candidates(lemma);
    const notices = [...new Set(forms.flatMap((f) => byHeadword.get(f) ?? []))];
    if (notices.length !== 1) continue;
    const [notice] = notices;
    glosses[lemma] = { excerpt: excerptOf(notice), uri: notice.uri, headword: baseHeadword(notice.word) };
    added.push(lemma);
  }
  console.log(`${corpus} : ${added.length} glose(s) rattachée(s) ${added.join(" ")}`);
  if (APPLY && added.length) writeFileSync(glossFile, JSON.stringify(glosses));
}
