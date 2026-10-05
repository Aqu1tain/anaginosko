import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";

// Outils de la spike KAN-92 : ce que l'assistant IA pourrait appeler (function
// calling), servi ici en ligne de commande sur les données du site. Chaque commande
// imprime du JSON. Usage : node scripts/ia-bench/outils.mjs <commande> [arguments]

const root = process.env.ANAGINOSKO_ROOT || path.resolve(new URL("../..", import.meta.url).pathname);
const pub = (...p) => path.join(root, "public", ...p);
const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const CORPORA = new Set(["nt", "lxx"]);

const books = (corpus) => readJson(pub(corpus, "books.json")).books;
const lemmas = (corpus) => readJson(pub(corpus, "lemmas.json"));
const lemmaEntry = (corpus, lemma) => lemmas(corpus).find((e) => e.lemma === lemma.normalize("NFC"));

function chapter(corpus, book, ch) {
  const file = pub(corpus, book, `${ch}.json`);
  if (!existsSync(file)) return null;
  const data = readJson(file);
  const fr = existsSync(pub(corpus, book, "fr.json")) ? readJson(pub(corpus, book, "fr.json"))[ch] ?? {} : {};
  return { reference: data.reference, mots: data.mots, fr };
}

function verses(corpus, book, ch, from = 1, to = Infinity) {
  const c = chapter(corpus, book, ch);
  if (!c) return null;
  const byVerse = new Map();
  c.mots.forEach((m, i) => {
    if (m.verse == null || m.verse < from || m.verse > to) return;
    if (!byVerse.has(m.verse)) byVerse.set(m.verse, []);
    byVerse.get(m.verse).push({ w: i, forme: m.grec, lemme: m.lemme, nature: m.nature, morph: m.morph ?? null });
  });
  return [...byVerse].map(([v, mots]) => ({
    ref: `${corpus}:${book}:${ch}:${v}`,
    grec: mots.map((m) => m.forme).join(" "),
    traduction: c.fr[v] ?? null,
    mots,
  }));
}

const verseText = (corpus, book, ch, v) => verses(corpus, book, ch, v, v)?.[0]?.grec ?? null;

const stripHtml = (html) => html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

let baillyIndex = null;
function baillyFile(lemma) {
  if (!baillyIndex) {
    baillyIndex = new Map();
    for (const f of readdirSync(pub("bailly"))) {
      const word = readJson(pub("bailly", f)).word?.normalize("NFC");
      if (!word) continue;
      for (const key of [word, word.split("-")[0].trim()]) if (!baillyIndex.has(key)) baillyIndex.set(key, f);
    }
  }
  return baillyIndex.get(lemma.normalize("NFC"));
}

function occurrences(corpus, lemma, { forme, morph, limite = 40 } = {}) {
  const entry = lemmaEntry(corpus, lemma);
  if (!entry) return { erreur: `lemme inconnu dans ${corpus} : ${lemma}` };
  const all = readJson(pub(corpus, "occ", `${entry.oid}.json`));
  const out = [];
  for (const o of all) {
    if (forme && o.f.replace(/[.,;·]/g, "") !== forme) continue;
    const word = verses(corpus, o.b, o.c, o.v, o.v)?.[0]?.mots.find((m) => m.lemme === entry.lemma && m.forme === o.f);
    if (morph && !(word?.morph ?? "").includes(morph)) continue;
    out.push({ ref: `${corpus}:${o.b}:${o.c}:${o.v}`, forme: o.f, morph: word?.morph ?? null, contexte: verseText(corpus, o.b, o.c, o.v) });
    if (out.length >= Number(limite)) break;
  }
  return { lemme: entry.lemma, corpus, total: all.length, renvoyees: out.length, occurrences: out };
}

const COMMANDS = {
  passage(corpus, book, ch, from, to) {
    const out = verses(corpus, book, Number(ch), from ? Number(from) : 1, to ? Number(to) : from ? Number(from) : Infinity);
    return out ?? { erreur: `passage introuvable : ${corpus}:${book}:${ch}` };
  },
  livres(corpus) {
    return books(corpus).map((b) => ({ id: b.id, nom: b.name, chapitres: b.chapters }));
  },
  lemme(corpus, lemma) {
    const entry = lemmaEntry(corpus, lemma);
    if (!entry) return { erreur: `lemme inconnu dans ${corpus} : ${lemma}` };
    const gloss = readJson(pub(corpus, "glosses.json"))[entry.lemma];
    const dist = existsSync(pub(corpus, "distribution", `${entry.oid}.json`)) ? readJson(pub(corpus, "distribution", `${entry.oid}.json`)) : {};
    const colloc = existsSync(pub(corpus, "colloc", `${entry.oid}.json`)) ? readJson(pub(corpus, "colloc", `${entry.oid}.json`)) : [];
    return {
      lemme: entry.lemma,
      nature: entry.nature,
      occurrences: entry.count,
      repartition: dist,
      glose_bailly: gloss?.excerpt ?? null,
      collocations: colloc.slice(0, 10).map((c) => ({ lemme: c.lemma, cooccurrences: c.n })),
    };
  },
  lemmes(corpus, motif) {
    const strip = (x) => x.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
    const m = strip(motif);
    return lemmas(corpus)
      .filter((e) => strip(e.lemma).includes(m) || e.translitR?.includes(m) || e.translit?.includes(m))
      .slice(0, 30)
      .map((e) => ({ lemme: e.lemma, nature: e.nature, occurrences: e.count }));
  },
  occurrences(corpus, lemma, limite) {
    return occurrences(corpus, lemma, { limite: limite ?? 40 });
  },
  morpho(corpus, lemma, motif, limite) {
    return occurrences(corpus, lemma, { morph: motif, limite: limite ?? 40 });
  },
  forme(corpus, lemma, forme, limite) {
    return occurrences(corpus, lemma, { forme, limite: limite ?? 40 });
  },
  bailly(lemma) {
    const file = baillyFile(lemma);
    if (!file) return { erreur: `pas de notice Bailly pour ${lemma}` };
    const notice = readJson(pub("bailly", file));
    const text = notice.senses.map((s) => stripHtml(s.html)).join("\n");
    return { source: "Bailly 2020 Hugo Chávez (CC BY-NC-ND 4.0)", lemme: notice.word, notice: text.slice(0, 6000), tronquee: text.length > 6000 };
  },
};

function main() {
  const [command, ...args] = process.argv.slice(2);
  const fn = COMMANDS[command];
  if (!fn) {
    console.log(JSON.stringify({ erreur: `commande inconnue : ${command}`, commandes: Object.keys(COMMANDS) }));
    return;
  }
  if (["passage", "livres", "lemme", "lemmes", "occurrences", "morpho", "forme"].includes(command) && !CORPORA.has(args[0])) {
    console.log(JSON.stringify({ erreur: "premier argument : nt ou lxx" }));
    return;
  }
  console.log(JSON.stringify(fn(...args), null, 1));
}

main();
