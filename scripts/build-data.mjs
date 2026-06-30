// Normalizes the two source datasets into src/data/texts.json.
// Run: node scripts/build-data.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(resolve(root, p), "utf8"));

const passages = read("data-sources/passages.json");

const collections = [
  {
    id: "passages",
    title: "Passages",
    subtitle: "Lecture suivie, prononciation érasmienne et restituée",
  },
];

// Chaque passage est un EXTRAIT d'un chapitre du NT. On dérive son texte et ses
// translittérations directement des données NT (source de vérité : η=i en
// restituée, lemmes, etc.), pour qu'ils restent strictement identiques à
// l'évangile. Du passage on ne garde que ses métadonnées (référence, niveau,
// traduction) et l'analyse morphologique `morph`, absente des données NT.
const PASSAGE_TO_NT = {
  1: ["jn", 1], 2: ["mt", 5], 3: ["1co", 13], 4: ["php", 2],
  5: ["jn", 15], 6: ["ro", 8], 7: ["lk", 2], 8: ["lk", 15],
  9: ["1jn", 1], 10: ["heb", 11], 11: ["re", 21], 12: ["mt", 6],
};
const ntCache = {};
const loadNt = (book, ch) => (ntCache[`${book}/${ch}`] ??= read(`public/nt/${book}/${ch}.json`));
const normGrec = (s) => s.normalize("NFC").replace(/[·,.;:’ʼ]/g, "").trim();

const passageTexts = passages.textes.map((t) => {
  const ref = PASSAGE_TO_NT[t.id];
  if (!ref) throw new Error(`passage ${t.id} : aucun chapitre NT associé`);
  const [book, ch] = ref;
  const nt = loadNt(book, ch);
  const verses = [...new Set((t.mots || []).map((m) => m.verse).filter((v) => v != null))];
  const slice = nt.mots.filter((m) => verses.includes(m.verse));

  // Garde-fou : la fusion positionnelle (morph du passage sur les mots du NT)
  // n'est sûre que si les deux séquences concordent mot à mot.
  const src = t.mots || [];
  const aligned = slice.length === src.length && slice.every((m, i) => normGrec(m.grec) === normGrec(src[i].grec));
  if (!aligned) throw new Error(`passage ${t.id} (${book} ${ch}) ne s'aligne plus sur le NT (${src.length} vs ${slice.length} mots)`);

  const mots = slice.map((m, i) => ({
    grec: m.grec,
    erasmien: m.erasmien,
    restituee: m.restituee,
    verse: m.verse ?? null,
    lemme: m.lemme ?? null,
    nature: m.nature ?? null,
    morph: src[i].morph ?? null,
  }));
  const join = (key) => mots.map((m) => m[key]).filter(Boolean).join(" ");

  return {
    id: `passages-${t.id}`,
    collection: "passages",
    niveau: t.niveau,
    reference: t.reference,
    grec: mots.map((m) => m.grec).join(" "),
    francais: t.francais || null,
    translitErasmien: join("erasmien"),
    translitRestituee: join("restituee"),
    mots,
  };
});

const out = {
  generatedFrom: ["data-sources/passages.json"],
  collections,
  texts: passageTexts,
};

const dest = resolve(root, "src/data/texts.json");
writeFileSync(dest, JSON.stringify(out, null, 2) + "\n", "utf8");
console.log(`Wrote ${out.texts.length} passages to src/data/texts.json`);

// --- Versions statiques, lisibles par les robots et les LLM (le SPA en hash
// routing ne sert qu'une coquille vide aux fetchers sans JS). ---

const SITE = "https://anaginosko.fr";
const esc = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Texte grec avec numéros de versets intercalés au début de chaque verset.
function greekWithVerses(t) {
  if (!t.mots?.length) return t.grec;
  let last = null;
  const parts = [];
  for (const m of t.mots) {
    if (m.verse != null && m.verse !== last) {
      parts.push(`(${m.verse})`);
      last = m.verse;
    }
    parts.push(m.grec);
  }
  return parts.join(" ");
}

const corpusHtml = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Anaginosko · corpus grec koinè (version texte)</title>
<meta name="description" content="Version texte, lisible sans JavaScript, des passages du Nouveau Testament en grec koinè avec translittération érasmienne et restituée." />
<link rel="canonical" href="${SITE}/corpus.html" />
</head>
<body>
<h1>Anaginosko · corpus grec koinè</h1>
<p>Version texte intégrale des passages du Nouveau Testament en grec koinè, avec
translittération érasmienne et restituée. Application interactive :
<a href="${SITE}/">${SITE}/</a></p>
${out.texts
  .map(
    (t) => `<article>
<h2>${esc(t.reference)}</h2>
<p lang="grc">${esc(greekWithVerses(t))}</p>
${t.translitErasmien ? `<p><strong>Érasmien :</strong> ${esc(t.translitErasmien)}</p>` : ""}
${t.translitRestituee ? `<p><strong>Restituée :</strong> ${esc(t.translitRestituee)}</p>` : ""}
</article>`,
  )
  .join("\n")}
<footer><p>Texte grec : SBLGNT (domaine public).</p></footer>
</body>
</html>
`;

const llmsTxt = `# Anaginosko

> Lire le grec koinè du Nouveau Testament, lettre par lettre. Application web
> (Next.js, rendu statique) : prononciation érasmienne et restituée, alphabet
> interactif, concordance, mode manuscrit, traduction française.

Le texte grec est rendu côté serveur : chaque page est lisible sans JavaScript.

## Parcourir

- Nouveau Testament (index) : ${SITE}/nt
- Un chapitre : ${SITE}/nt/{livre}/{chapitre} (ex. ${SITE}/nt/jn/1)
- Données structurées d'un chapitre (JSON) : ${SITE}/nt/{livre}/{chapitre}.json
  - mots avec grec, translittération érasmienne et restituée, verset, lemme, nature
- Concordance d'un lemme : ${SITE}/concordance/{lemme}
- Alphabet grec : ${SITE}/alphabet
- Corpus des passages choisis (HTML, sans JS) : ${SITE}/corpus.html

## Passages choisis (texte intégral)

${out.texts.map((t) => `### ${t.reference}\n\n${greekWithVerses(t)}`).join("\n\n")}
`;

writeFileSync(resolve(root, "public/corpus.html"), corpusHtml, "utf8");
writeFileSync(resolve(root, "public/llms.txt"), llmsTxt, "utf8");
console.log("Wrote public/corpus.html and public/llms.txt");
