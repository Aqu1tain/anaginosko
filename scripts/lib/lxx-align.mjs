// Réalignement Giguet (français) sur la versification Rahlfs (grec).
//
// Signal : les noms propres traversent la traduction (Δαυιδ→David, Σιων→Sion).
// On compare les tokens « nom » du français à la translittération érasmienne déjà
// présente dans le grec, par similarité de bigrammes (Dice). Pour un chapitre, on
// cherche le décalage δ (français v ↔ grec v+δ) qui maximise le recouvrement des
// ancres. On ne réécrit que sur un gain franc, sinon on laisse en bloc.

import fs from "node:fs";
import path from "node:path";

export const strip = (s) =>
  (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const bigrams = (s) => {
  const b = new Set();
  for (let i = 0; i < s.length - 1; i++) b.add(s.slice(i, i + 2));
  return b;
};

export function dice(a, b) {
  if (a === b) return a.length ? 1 : 0;
  if (a.length < 2 || b.length < 2) return 0;
  const A = bigrams(a),
    B = bigrams(b);
  let inter = 0;
  for (const g of A) if (B.has(g)) inter++;
  return (2 * inter) / (A.size + B.size);
}

// Tokens « nom » du français : majuscule initiale ou mot d'au moins 4 lettres
// (les noms propres et termes pleins ; les mots-outils ne croisent pas le grec).
export function frTokens(text) {
  return (String(text).match(/\p{L}+/gu) || [])
    .filter((w) => /^\p{Lu}/u.test(w) || w.length >= 4)
    .map(strip)
    .filter((w) => w.length >= 3);
}

// Charge un chapitre grec → Map(verset → [tokens érasmiens >=3 lettres]).
export function loadGreekChapter(root, id, ch) {
  const p = path.join(root, id, `${ch}.json`);
  if (!fs.existsSync(p)) return null;
  const mots = JSON.parse(fs.readFileSync(p, "utf8")).mots || [];
  const byVerse = new Map();
  for (const m of mots) {
    if (m.verse == null) continue;
    if (!byVerse.has(m.verse)) byVerse.set(m.verse, []);
    const e = strip(m.erasmien || "");
    if (e.length >= 3) byVerse.get(m.verse).push(e);
  }
  return byVerse;
}

// Recouvrement d'ancres entre un verset français et les tokens grecs d'un verset.
export function anchorScore(frText, grToks) {
  if (!grToks || !grToks.length) return 0;
  let s = 0;
  for (const ft of frTokens(frText)) {
    let best = 0;
    for (const gt of grToks) {
      const d = dice(ft, gt);
      if (d > best) best = d;
    }
    if (best >= 0.6) s += best;
  }
  return s;
}

// Détecte le meilleur décalage δ pour un chapitre français contre son chapitre
// grec. Ne score que les versets grecs présents (les versets qui débordent vers
// un chapitre voisin ne pénalisent pas). Renvoie le classement et un verdict.
export function detectOffset(frChapter, greekByVerse, opts = {}) {
  const range = opts.range ?? 2;
  const fvs = Object.keys(frChapter).map(Number).sort((a, b) => a - b);
  const results = [];
  for (let d = -range; d <= range; d++) {
    let total = 0,
      matched = 0;
    for (const v of fvs) {
      const toks = greekByVerse.get(v + d);
      if (!toks) continue;
      const s = anchorScore(frChapter[String(v)], toks);
      total += s;
      if (s > 0) matched++;
    }
    results.push({ d, total: +total.toFixed(2), matched });
  }
  const ranked = [...results].sort((a, b) => b.total - a.total);
  const best = ranked[0];
  const zero = results.find((r) => r.d === 0);
  const second = ranked.find((r) => r.d !== best.d) ?? { total: 0 };

  // Verdict. « aligned » : δ=0 gagne ou personne ne se détache → on apparie tel
  // quel. « shift » : un δ≠0 bat nettement δ=0 et le second → on réécrit.
  // « unresolved » : signal plat (réordonné / additions) → bloc.
  const MIN_EVIDENCE = 3;
  const OVER_ZERO = 1.4;
  const OVER_SECOND = 1.3;
  const FLOOR = 2;
  let verdict;
  if (best.d === 0) verdict = "aligned";
  else if (
    best.matched >= MIN_EVIDENCE &&
    best.total >= FLOOR &&
    best.total >= OVER_ZERO * Math.max(zero.total, 0.1) &&
    best.total >= OVER_SECOND * Math.max(second.total, 0.1)
  )
    verdict = "shift";
  else verdict = "unresolved";

  return { verdict, delta: verdict === "shift" ? best.d : 0, best, zero, second, ranked };
}
