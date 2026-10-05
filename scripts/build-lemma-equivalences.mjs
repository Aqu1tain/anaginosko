import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

// Équivalences de lemmes Septante -> NT. MorphGNT (NT) et la morphologie CATSS (LXX)
// ne citent pas toujours un mot sous la même forme : voix (φοβέω / φοβέομαι), iota
// souscrit (σώζω / σῴζω), esprit des noms propres (Ἱερουσαλήμ / Ἰερουσαλήμ). La
// concordance « toute la Bible » et les fiches croisées s'appuient sur cette table
// pour réunir un même mot. Les homographes (εἶμι / εἰμί, νομός / νόμος…) restent
// séparés : voir EXCLUS.
//
//   node scripts/build-lemma-equivalences.mjs          (écrit la table)
//   node scripts/build-lemma-equivalences.mjs --check  (échoue si la table diffère)

const root = path.resolve(new URL("..", import.meta.url).pathname);
const out = path.join(root, "src/data/lemma-equivalences.json");
const lemmas = (corpus) => JSON.parse(readFileSync(path.join(root, "public", corpus, "lemmas.json"), "utf8"));

// Paires repérées par les règles mais qui désignent des mots différents.
const EXCLUS = {
  "ἄγνος": "gattilier, plante (≠ ἁγνός, pur)",
  "εἶμι": "aller (≠ εἰμί, être)",
  "ἦ": "particule d'affirmation (≠ ἤ, ou)",
  "νομός": "district (≠ νόμος, loi)",
  "ὅρος": "borne (≠ ὄρος, montagne)",
  "ποτός": "boisson (≠ πότος, beuverie)",
  "Ἡλί": "Éli le prêtre (≠ ἠλί de Mt 27,46 et Ἠλί de Lc 3,23)",
  "φειδώ": "nom, épargne (≠ φείδομαι, verbe)",
  "δύνομαι": "rattachement incertain",
  "Μαχω": "nom propre translittéré (≠ μάχομαι)",
};

// Paires dont la casse diffère mais qui sont le même mot.
const CASSE_ADMISE = {
  "Ἀββᾶ": "αββα",
  "βενιαμιν": "Βενιαμίν",
  "ἑλληνικός": "Ἑλληνικός",
  "Ἰουδαΐζω": "ἰουδαΐζω",
  "ισραηλ": "Ἰσραήλ",
  "σαβαώθ": "Σαβαώθ",
  "σαουλ": "Σαούλ",
  "χερούβ": "Χεροῦβ",
  "χριστός": "Χριστός",
};

const strip = (s) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const capital = (s) => s.charAt(0) !== s.charAt(0).toLowerCase();
const VOIX = [["ομαι", "ω"], ["ω", "ομαι"], ["ουμαι", "ω"]];

function build() {
  const nt = lemmas("nt");
  const lxx = lemmas("lxx");
  const ntSet = new Set(nt.map((e) => e.lemma));
  const lxxSet = new Set(lxx.map((e) => e.lemma));
  const ntByKey = new Map();
  for (const e of nt) {
    const k = strip(e.lemma);
    ntByKey.set(k, [...(ntByKey.get(k) ?? []), e.lemma]);
  }

  const candidates = (lemma) => {
    const key = strip(lemma);
    const keys = [key, ...VOIX.filter(([a]) => key.endsWith(a)).map(([a, b]) => key.slice(0, -a.length) + b)];
    return [...new Set(keys.flatMap((k) => ntByKey.get(k) ?? []))];
  };

  const map = {};
  const targets = new Map();
  for (const { lemma } of lxx) {
    if (ntSet.has(lemma) || EXCLUS[lemma]) continue;
    const found = candidates(lemma).filter((t) => !lxxSet.has(t));
    if (found.length !== 1) continue;
    const [target] = found;
    if (capital(lemma) !== capital(target) && CASSE_ADMISE[lemma] !== target) continue;
    if (targets.has(target)) {
      delete map[targets.get(target)];
      continue;
    }
    targets.set(target, lemma);
    map[lemma] = target;
  }
  const sorted = Object.fromEntries(Object.entries(map).sort(([a], [b]) => a.localeCompare(b, "el")));
  return {
    note: "Septante -> NT : même mot cité sous une autre forme (voix, iota souscrit, esprit, accent). Généré par scripts/build-lemma-equivalences.mjs, ne pas éditer à la main.",
    lxxToNt: sorted,
  };
}

const table = `${JSON.stringify(build(), null, 1)}\n`;
if (process.argv.includes("--check")) {
  const current = readFileSync(out, "utf8");
  if (current !== table) {
    console.error("src/data/lemma-equivalences.json n'est pas à jour : relancer scripts/build-lemma-equivalences.mjs");
    process.exit(1);
  }
  console.log("équivalences de lemmes à jour");
} else {
  writeFileSync(out, table);
  console.log(`${Object.keys(JSON.parse(table).lxxToNt).length} équivalences écrites`);
}
