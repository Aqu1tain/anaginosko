import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

// Règles de vedette du Bailly, partagées par les scripts de rattachement. Mêmes
// règles que src/data/glosses.ts : astérisque et iota souscrit ignorés, accents et
// esprits gardés ; un lemme se cherche aussi à l'actif (verbe moyen) et à la graphie
// attique (-γίγνομαι).
export const key = (word) =>
  word.normalize("NFC").replace(/ϐ/g, "β").replace(/[··]/g, "").replace(/^\*/, "").normalize("NFD").replace(/ͅ/g, "").normalize("NFC");

export const baseHeadword = (word) => key(word.split(/[,\s-]/)[0].trim());

export const candidates = (lemma) => {
  const l = lemma.normalize("NFC");
  return [...new Set([l, l.replace(/ομαι$/, "ω"), l.replace(/γίνομαι$/, "γίγνομαι")].map(key))];
};

export const glossHeadword = (gloss) => (gloss.headword ? key(gloss.headword) : baseHeadword(gloss.excerpt));

// Une glose issue d'un renvoi (« ᾅδης, v. Ἅιδης ») se valide par sa vedette d'origine.
export const verifiedFor = (lemma, gloss) => !!gloss && candidates(lemma).includes(gloss.from ? key(gloss.from) : glossHeadword(gloss));

// Renvoi pur : la vedette (et ses formes), « v. », une vedette grecque, rien d'autre.
// « Ἄζωτος … v. de Palestine » (v. = ville) ou « compar. d’ἄνω (v. ἄνω 2) » n'en sont pas.
const REDIRECT = /^(.{1,60}?)[,\s]+v\.\s+([\p{Script=Greek}̀-ͯ’']+)(?:\s+\d+)?(?:,\s*(?:fin|etc)\.?)?\s*\.?\s*$/u;
export const redirectTarget = (excerpt) => excerpt.replace(/\s+/g, " ").trim().match(REDIRECT)?.[2] ?? null;

const text = (html) => html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
export const excerptOf = (notice) => {
  const full = notice.senses.map((s) => text(s.html)).join(" ");
  if (full.length <= 150) return full;
  return `${full.slice(0, 150).replace(/\s+\S*$/, "")}…`;
};

// Notices figées dans public/bailly, indexées par vedette.
export function noticesByHeadword(publicDir) {
  const byHeadword = new Map();
  for (const file of readdirSync(path.join(publicDir, "bailly"))) {
    const notice = JSON.parse(readFileSync(path.join(publicDir, "bailly", file), "utf8"));
    if (!notice.word) continue;
    const k = baseHeadword(notice.word);
    byHeadword.set(k, [...(byHeadword.get(k) ?? []), notice]);
  }
  return byHeadword;
}
