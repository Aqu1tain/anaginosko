// Translittération (voyelle accentuée en MAJUSCULE) -> IPA pour Azure TTS.
// Partagé par build-audio-azure.mjs (passages) et build-nt-audio.mjs (NT).

// Digraphes consonantiques + ου, communs aux deux systèmes.
const DIGRAPH = { th: "θ", kh: "x", ph: "f", ps: "ps", ks: "ks", dz: "dz", ou: "u" };

// Diphtongues érasmiennes « à la française ». αυ/ευ/υι -> voyelle simple ([o]/[ø]/
// [ɥi]). αι/ει/οι (notés « aï/éï/oï » avec tréma par le cours, cf. translit.mjs)
// sont des semi-voyelles glissées : « ail » [aj], « abeille » [ɛj], « boy » [oj].
// Les hiatus authentiques (noms propres écrits « ai/oi » SANS tréma : Ἠσαΐας,
// Καϊάφα…) ne matchent pas et restent deux voyelles pleines. ου est dans DIGRAPH.
const ERASMIEN_DIPHTHONG = {
  eu: "ø", au: "o", ui: "ɥi",
  "aï": "aj", "éï": "ɛj", "oï": "oj",
};

const CHAR = {
  a: "a", á: "a", à: "a", e: "e", é: "e", è: "ɛ", ê: "ɛ", i: "i", í: "i", ï: "i",
  o: "o", ó: "o", ô: "ɔ", u: "y", ü: "y", y: "i", b: "b", c: "k", d: "d", f: "f",
  g: "ɡ", h: "", j: "ʒ", k: "k", l: "l", m: "m", n: "n", p: "p", q: "k", r: "r",
  s: "s", t: "t", v: "v", w: "v", x: "ks", z: "z",
};

// Unités IPA qui comptent comme noyau vocalique (voyelles + diphtongues fusionnées).
const VOWEL_UNITS = new Set(["a", "e", "ɛ", "i", "o", "ɔ", "u", "y", "ø", "ɥi", "aj", "ɛj", "oj"]);
const isVowelUnit = (u) => VOWEL_UNITS.has(u);

export function translitToIpa(translit, system = "erasmien") {
  let stressIdx = -1;
  for (let i = 0; i < translit.length; i++) {
    const c = translit[i];
    if (c !== c.toLowerCase() && c === c.toUpperCase() && /\p{L}/u.test(c)) { stressIdx = i; break; }
  }
  const s = translit.toLowerCase();
  const diph = system === "erasmien" ? ERASMIEN_DIPHTHONG : null;
  const out = [];
  let stressed = false, i = 0;
  while (i < s.length) {
    const two = s.slice(i, i + 2);
    let unit, len;
    if (diph && diph[two] !== undefined) { unit = diph[two]; len = 2; }
    else if (DIGRAPH[two] !== undefined) { unit = DIGRAPH[two]; len = 2; }
    else {
      unit = CHAR[s[i]] ?? "";
      len = 1;
      // Koine restituée : γ = [ɣ] (fricative vélaire), sauf après nasale (γγ/νγ -> [ɡ]).
      if (system === "restituee" && s[i] === "g" && s[i - 1] !== "n") unit = "ɣ";
    }
    const coversStress = stressIdx >= i && stressIdx < i + len;
    if (!stressed && coversStress && isVowelUnit(unit)) {
      let pos = out.length;
      while (pos > 0 && out[pos - 1] !== "ˈ" && !isVowelUnit(out[pos - 1])) pos--;
      out.splice(pos, 0, "ˈ");
      stressed = true;
    }
    if (unit) out.push(unit);
    i += len;
  }
  return out.join("");
}

// Vrai si la translittération érasmienne contient une diphtongue fusionnée
// (donc son IPA change avec ce module) -> sert au ciblage de la régénération.
export const hasErasmienDiphthong = (translit) => /aï|éï|oï|eu|au|ui/.test(translit.toLowerCase());
