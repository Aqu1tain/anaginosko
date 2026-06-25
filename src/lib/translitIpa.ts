// Port TS de scripts/lib/translit-ipa.mjs : translittération -> IPA. Sert à
// pré-remplir l'IPA automatique dans l'éditeur de prononciation (override admin).
// Garder synchronisé avec le module .mjs utilisé pour la génération audio.

export type TranslitSystem = "erasmien" | "restituee";

const DIGRAPH: Record<string, string> = {
  th: "θ", kh: "x", ph: "f", ps: "ps", ks: "ks", dz: "dz", ou: "u",
};

const ERASMIEN_DIPHTHONG: Record<string, string> = {
  eu: "ø", au: "o", ui: "ɥi", "aï": "aj", "éï": "ɛj", "oï": "oj",
};

const CHAR: Record<string, string> = {
  a: "a", á: "a", à: "a", e: "e", é: "e", è: "ɛ", ê: "ɛ", i: "i", í: "i", ï: "i",
  o: "o", ó: "o", ô: "ɔ", u: "y", ü: "y", y: "i", b: "b", c: "k", d: "d", f: "f",
  g: "ɡ", h: "", j: "ʒ", k: "k", l: "l", m: "m", n: "n", p: "p", q: "k", r: "r",
  s: "s", t: "t", v: "v", w: "v", x: "ks", z: "z",
};

const VOWEL_UNITS = new Set(["a", "e", "ɛ", "i", "o", "ɔ", "u", "y", "ø", "ɥi", "aj", "ɛj", "oj"]);
const isVowelUnit = (u: string) => VOWEL_UNITS.has(u);

export function translitToIpa(translit: string, system: TranslitSystem = "erasmien"): string {
  let stressIdx = -1;
  for (let i = 0; i < translit.length; i++) {
    const c = translit[i];
    if (c !== c.toLowerCase() && c === c.toUpperCase() && /\p{L}/u.test(c)) {
      stressIdx = i;
      break;
    }
  }
  const s = translit.toLowerCase();
  const diph = system === "erasmien" ? ERASMIEN_DIPHTHONG : null;
  const out: string[] = [];
  let stressed = false;
  let i = 0;
  while (i < s.length) {
    const two = s.slice(i, i + 2);
    let unit: string;
    let len: number;
    if (diph && diph[two] !== undefined) {
      unit = diph[two];
      len = 2;
    } else if (DIGRAPH[two] !== undefined) {
      unit = DIGRAPH[two];
      len = 2;
    } else {
      unit = CHAR[s[i]] ?? "";
      len = 1;
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
