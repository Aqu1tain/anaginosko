import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";

// Vérification automatique d'une réponse de l'assistant (KAN-92) : format, types,
// références internes contrôlées contre le corpus, références attendues du cas.
// Usage : node scripts/ia-bench/verifier.mjs <id-du-cas> <reponse.json>

const root = path.resolve(new URL("../..", import.meta.url).pathname);
const pub = (...p) => path.join(root, "public", ...p);
const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));

const TYPES = new Set(["texte", "morphologie", "syntaxe", "lexique", "parallele", "interpretation", "hypothese", "reception"]);
const CONFIANCES = new Set(["elevee", "moyenne", "faible"]);

function verseExists(ref) {
  const [corpus, book, ch, v] = String(ref).split(":");
  const file = pub(corpus ?? "", book ?? "", `${ch}.json`);
  return existsSync(file) && readJson(file).mots.some((m) => m.verse === Number(v));
}

const lemmaExists = (corpus, lemme) =>
  existsSync(pub(corpus, "lemmas.json")) && readJson(pub(corpus, "lemmas.json")).some((e) => e.lemma === String(lemme).normalize("NFC"));

let baillyWords = null;
function baillyExists(lemme) {
  baillyWords ??= new Set(
    readdirSync(pub("bailly")).flatMap((f) => {
      const word = readJson(pub("bailly", f)).word?.normalize("NFC");
      return word ? [word, word.split("-")[0].trim()] : [];
    }),
  );
  return baillyWords.has(String(lemme).normalize("NFC"));
}

function checkCitation(c) {
  if (c.kind === "verset") return verseExists(c.ref) ? null : `verset introuvable ${c.ref}`;
  if (c.kind === "lemme") return lemmaExists(c.corpus, c.lemme) ? null : `lemme introuvable ${c.corpus}:${c.lemme}`;
  if (c.kind === "lexique") return c.source === "bailly" && baillyExists(c.lemme) ? null : `notice introuvable ${c.source}:${c.lemme}`;
  if (c.kind === "externe") return null;
  return `type de citation inconnu ${c.kind}`;
}

function parseAnswer(raw) {
  const text = raw.trim().replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  return JSON.parse(text);
}

const [id, file] = process.argv.slice(2);
const cas = readJson(path.join(path.dirname(new URL(import.meta.url).pathname), "cas.json")).cas.find((c) => c.id === id);
if (!cas || !file) throw new Error("usage : node verifier.mjs <id-du-cas> <reponse.json>");

const report = { cas: id, format: "ok", problemes: [], citations: { internes: 0, invalides: [], externes: [] }, attendues_manquantes: [] };
let answer;
try {
  answer = parseAnswer(readFileSync(file, "utf8"));
} catch (e) {
  report.format = `JSON illisible : ${e.message}`;
  console.log(JSON.stringify(report, null, 1));
  process.exit(0);
}

const citations = answer.citations ?? {};
const usedIds = new Set();
for (const a of answer.affirmations ?? []) {
  if (!TYPES.has(a.type)) report.problemes.push(`type inconnu : ${a.type}`);
  if (!CONFIANCES.has(a.confiance)) report.problemes.push(`confiance inconnue : ${a.confiance}`);
  for (const c of a.citations ?? []) usedIds.add(c);
}
for (const block of [...(answer.lectures ?? []), ...(answer.traductions ?? [])]) for (const c of block.citations ?? []) usedIds.add(c);
for (const cid of usedIds) if (!citations[cid]) report.problemes.push(`citation non définie : ${cid}`);

const cited = new Set();
for (const [cid, c] of Object.entries(citations)) {
  if (c.kind === "externe") {
    report.citations.externes.push({ id: cid, ...c });
    continue;
  }
  report.citations.internes++;
  const problem = checkCitation(c);
  if (problem) report.citations.invalides.push({ id: cid, probleme: problem });
  if (c.kind === "verset") cited.add(c.ref);
}
report.attendues_manquantes = cas.references_attendues.filter((r) => !cited.has(r));
report.nombre = {
  affirmations: answer.affirmations?.length ?? 0,
  lectures: answer.lectures?.length ?? 0,
  traductions: answer.traductions?.length ?? 0,
  limites: answer.limites?.length ?? 0,
};
console.log(JSON.stringify(report, null, 1));
