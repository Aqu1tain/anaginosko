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

const passageTexts = passages.textes.map((t) => ({
  id: `passages-${t.id}`,
  collection: "passages",
  niveau: t.niveau,
  reference: t.reference,
  grec: t.grec,
  translitErasmien: t.erasmien_continu || null,
  translitRestituee: t.restituee_continu || null,
  mots: (t.mots || []).map((m) => ({
    grec: m.grec,
    erasmien: m.erasmien,
    restituee: m.restituee,
    verse: m.verse ?? null,
  })),
}));

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

const SITE = "https://aqu1tain.github.io/anaginosko";
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
> mobile-first : prononciation érasmienne et restituée, alphabet interactif,
> mode manuscrit (scriptio continua), numéros de versets.

L'application est un SPA en hash routing : les URL \`#/text/...\` ne sont pas
lisibles sans JavaScript. Le contenu intégral est disponible en texte ici :

- [Corpus complet (HTML)](${SITE}/corpus.html)

## Passages

${out.texts.map((t) => `### ${t.reference}\n\n${greekWithVerses(t)}`).join("\n\n")}
`;

writeFileSync(resolve(root, "public/corpus.html"), corpusHtml, "utf8");
writeFileSync(resolve(root, "public/llms.txt"), llmsTxt, "utf8");
console.log("Wrote public/corpus.html and public/llms.txt");
