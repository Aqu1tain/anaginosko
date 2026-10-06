import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { baseHeadword, excerptOf, key, noticesByHeadword, redirectTarget, verifiedFor } from "./lib/bailly-headwords.mjs";

// Remplace les notices du Bailly qui ne font que renvoyer à une autre vedette
// (« ᾅδης, v. Ἅιδης. », « γίνομαι, v. γίγνομαι, fin. ») par la notice cible. `from`
// garde la vedette d'origine, qui seule valide le rattachement au lemme
// (src/data/glosses.ts). La cible est prise dans public/bailly, sinon demandée à
// api.bailly.app (depuis un poste autorisé : le VPS est refusé). Ensuite :
// node scripts/fetch-bailly-notices.mjs fige les notices des nouvelles cibles.
//
//   node scripts/resolve-bailly-redirects.mjs           (aperçu)
//   node scripts/resolve-bailly-redirects.mjs --apply   (écrit glosses.json)

const root = path.resolve(new URL("..", import.meta.url).pathname);
const pub = (...p) => path.join(root, "public", ...p);
const APPLY = process.argv.includes("--apply");

const local = noticesByHeadword(pub());
const remote = new Map();

// Entrées du Bailly dont la vedette est exactement `word`.
async function lookup(word) {
  if (remote.has(word)) return remote.get(word);
  const res = await fetch(`https://api.bailly.app/lookup/${encodeURIComponent(word)}`);
  const entries = res.ok ? ((await res.json()).data?.entries ?? []) : [];
  const exact = entries
    .filter((e) => e.word && e.uri && e.excerpt && baseHeadword(e.word) === key(word))
    .map((e) => ({ excerpt: e.excerpt.trim(), uri: e.uri, headword: baseHeadword(e.word) }));
  remote.set(word, exact);
  await new Promise((r) => setTimeout(r, 120));
  return exact;
}

const single = (list) => (list.length === 1 ? list[0] : null);

async function resolve(target) {
  const notices = local.get(key(target)) ?? [];
  if (notices.length === 1) {
    const [n] = notices;
    return { excerpt: excerptOf(n), uri: n.uri, headword: baseHeadword(n.word) };
  }
  return notices.length ? null : single(await lookup(target));
}

// Homonyme de même vedette qui n'est pas un renvoi : c'est lui le bon mot
// (ἀπορέω « être dans l'embarras », et non l'ionien ἀπορέω, v. ἀφοράω).
const homonym = async (headword) => single((await lookup(headword)).filter((e) => !redirectTarget(e.excerpt)));

for (const corpus of ["nt", "lxx"]) {
  const glossFile = pub(corpus, "glosses.json");
  const glosses = JSON.parse(readFileSync(glossFile, "utf8"));
  const done = [];
  const skipped = [];
  for (const [lemma, gloss] of Object.entries(glosses)) {
    if (gloss.from || !verifiedFor(lemma, gloss)) continue;
    const target = redirectTarget(gloss.excerpt);
    if (!target) continue;
    const from = baseHeadword(gloss.headword ?? gloss.excerpt);
    const own = await homonym(from);
    if (own) {
      glosses[lemma] = own;
      done.push(`${lemma} (homonyme)`);
      continue;
    }
    const found = await resolve(target);
    if (!found || redirectTarget(found.excerpt)) {
      skipped.push(`${lemma}→${target}`);
      continue;
    }
    glosses[lemma] = { ...found, from };
    done.push(`${lemma}→${found.headword}`);
  }
  console.log(`${corpus} : ${done.length} renvoi(s) résolu(s), ${skipped.length} laissé(s)\n  ${done.join(" ")}\n  laissés : ${skipped.join(" ")}`);
  if (APPLY && done.length) writeFileSync(glossFile, JSON.stringify(glosses));
}
