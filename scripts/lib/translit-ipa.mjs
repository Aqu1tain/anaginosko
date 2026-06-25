// Translittération (voyelle accentuée en MAJUSCULE) -> IPA pour Azure TTS.
// Partagé par build-audio-azure.mjs (passages) et build-nt-audio.mjs (NT).

// Digraphes consonantiques + ου, communs aux deux systèmes.
const DIGRAPH = { th: "θ", kh: "x", ph: "f", ps: "ps", ks: "ks", dz: "dz", ou: "u" };

// Diphtongues érasmiennes fusionnées en UN son « à la française ». Seules αυ/ευ/υι
// fusionnent : le cours translittère αι/ει/οι en « aï/éï/oï » (deux voyelles, cf.
// translit.mjs), donc on ne les fusionne PAS — sinon on écrase aussi les hiatus
// authentiques écrits « ai/oi » (Ἠσαΐας, Καϊάφα…). ου est déjà dans DIGRAPH.
const ERASMIEN_DIPHTHONG = { eu: "ø", au: "o", ui: "ɥi" };

const CHAR = {
  a: "a", á: "a", à: "a", e: "e", é: "e", è: "ɛ", ê: "ɛ", i: "i", í: "i", ï: "i",
  o: "o", ó: "o", ô: "ɔ", u: "y", ü: "y", y: "i", b: "b", c: "k", d: "d", f: "f",
  g: "ɡ", h: "", j: "ʒ", k: "k", l: "l", m: "m", n: "n", p: "p", q: "k", r: "r",
  s: "s", t: "t", v: "v", w: "v", x: "ks", z: "z",
};

// Unités IPA qui comptent comme noyau vocalique (voyelles + diphtongues fusionnées).
const VOWEL_UNITS = new Set(["a", "e", "ɛ", "i", "o", "ɔ", "u", "y", "ø", "wa", "ɥi"]);
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
export const hasErasmienDiphthong = (translit) => /eu|au|ui/i.test(translit);
