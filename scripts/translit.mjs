// Translittération grec koinè -> érasmien / restituée, alignée sur les
// conventions du cours (et validées contre les passages déjà translittérés).
// La voyelle de la syllabe accentuée est mise en MAJUSCULE.

const COMBINING = /\p{M}/gu;
const OXIA = "́", VARIA = "̀", PERISPOMENI = "͂";
const DASIA = "̔";
const DIAERESIS = "̈";

function decompose(ch) {
  const d = ch.normalize("NFD");
  const base = d.replace(COMBINING, "");
  const marks = d.slice(base.length);
  return { base, marks };
}

// Lettre de base -> latin (érasmien | restituée).
const LET = {
  α: ["a", "a"], β: ["b", "v"], γ: ["g", "g"], δ: ["d", "d"], ε: ["é", "é"],
  ζ: ["dz", "z"], η: ["ê", "i"], θ: ["t", "th"], ι: ["i", "i"], κ: ["k", "k"],
  λ: ["l", "l"], μ: ["m", "m"], ν: ["n", "n"], ξ: ["ks", "ks"], ο: ["o", "o"],
  π: ["p", "p"], ρ: ["r", "r"], σ: ["s", "s"], ς: ["s", "s"], τ: ["t", "t"],
  υ: ["u", "u"], φ: ["f", "f"], χ: ["k", "kh"], ψ: ["ps", "ps"], ω: ["ô", "ô"],
};

const VOWELS = "αεηιουω";
const isVowelBase = (b) => VOWELS.includes(b);

// Diphtongues : [érasmien, restituée]. La restituée de αυ/ευ dépend du voisement.
const DIPH_ER = { αυ: "au", ευ: "eu", ου: "ou", αι: "aï", ει: "éï", οι: "oï", υι: "ui" };
const DIPH_RE = { ου: "ou", αι: "é", ει: "i", οι: "u", υι: "ui" };
const VOICED_NEXT = "αεηιουωβγδζλμνρ"; // ce qui suit αυ/ευ => av/ev sinon af/ef

function analyze(word) {
  // -> tableau de { base, lower, marks, idx } pour les lettres grecques
  const out = [];
  for (const ch of word.normalize("NFC")) {
    const { base, marks } = decompose(ch);
    const lower = base.toLowerCase();
    if (!LET[lower]) continue; // ponctuation, apostrophe d'élision, etc.
    out.push({ lower, marks });
  }
  return out;
}

function transliterate(word, system) {
  const sys = system === "restituee" ? 1 : 0;
  const g = analyze(word);
  if (g.length === 0) return "";

  // Esprit rude : sur la 1re voyelle (ou rho).
  const rough = g.some((x, i) => x.marks.includes(DASIA) && i <= 1);
  const firstIsRho = g[0].lower === "ρ";

  const pieces = []; // { text, stressed }
  let i = 0;
  while (i < g.length) {
    const cur = g[i];
    const next = g[i + 1];
    const stressed =
      cur.marks.includes(OXIA) || cur.marks.includes(VARIA) || cur.marks.includes(PERISPOMENI) ||
      (next && (next.marks.includes(OXIA) || next.marks.includes(VARIA) || next.marks.includes(PERISPOMENI)) &&
        isVowelBase(cur.lower) && isVowelBase(next.lower) && (cur.lower + next.lower) in DIPH_ER);

    // Diphtongue ? (le tréma sur la 2e voyelle la sépare : pas de diphtongue)
    if (next && isVowelBase(cur.lower) && isVowelBase(next.lower) && !next.marks.includes(DIAERESIS)) {
      const pair = cur.lower + next.lower;
      if (pair in DIPH_ER) {
        let text;
        if ((pair === "αυ" || pair === "ευ")) {
          const after = g[i + 2];
          const voiced = !after || VOICED_NEXT.includes(after.lower);
          if (sys === 1) text = (pair === "αυ" ? (voiced ? "av" : "af") : (voiced ? "év" : "éf"));
          else text = DIPH_ER[pair];
        } else {
          text = sys === 1 ? (DIPH_RE[pair] ?? DIPH_ER[pair]) : DIPH_ER[pair];
        }
        pieces.push({ text, stressed });
        i += 2;
        continue;
      }
    }

    // γ nasal : γ devant γ/κ/χ/ξ -> n.
    if (cur.lower === "γ" && next && "γκχξ".includes(next.lower)) {
      pieces.push({ text: "n", stressed });
      i += 1;
      continue;
    }

    pieces.push({ text: LET[cur.lower][sys], stressed });
    i += 1;
  }

  // Casse de TOUTES les syllabes accentuées (mots à double accent inclus).
  let result = "";
  for (const p of pieces) {
    result += p.stressed ? p.text.charAt(0).toUpperCase() + p.text.slice(1) : p.text;
  }

  // Esprit rude : voyelle initiale -> 'h' devant ; rho initial -> 'rh' en
  // érasmien, 'r' simple en restituée (jamais 'hr').
  if (rough) {
    if (firstIsRho) {
      if (sys === 0) result = "r" + "h" + result.slice(1);
    } else {
      result = "h" + result;
    }
  }
  return result;
}

export const grecToErasmien = (w) => transliterate(w, "erasmien");
export const grecToRestituee = (w) => transliterate(w, "restituee");
