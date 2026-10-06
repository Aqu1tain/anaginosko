// Translittération savante usuelle (theos, logos, agape, kyrios, hamartia), celle que
// l'on tape dans un moteur de recherche. Distincte des prononciations du lecteur.
const LETTERS: Record<string, string> = {
  α: "a", β: "b", γ: "g", δ: "d", ε: "e", ζ: "z", η: "e", θ: "th", ι: "i", κ: "k", λ: "l", μ: "m", ν: "n",
  ξ: "x", ο: "o", π: "p", ρ: "r", σ: "s", ς: "s", τ: "t", υ: "y", φ: "ph", χ: "ch", ψ: "ps", ω: "o",
};
const VELARS = new Set(["γ", "κ", "ξ", "χ"]);
const DIPHTHONG_FIRST = new Set(["α", "ε", "η", "ο"]);
const ROUGH = "̔";

function romanizeWord(word: string): string {
  const decomposed = word.normalize("NFD");
  const rough = decomposed.includes(ROUGH);
  const letters = [...decomposed.replace(/\p{M}/gu, "").toLowerCase()];
  const out = letters.map((ch, i) => {
    const next = letters[i + 1];
    const prev = letters[i - 1];
    if (ch === "γ" && next && VELARS.has(next)) return "n";
    if (ch === "υ" && ((prev && DIPHTHONG_FIRST.has(prev)) || next === "ι")) return "u";
    return LETTERS[ch] ?? ch;
  });
  let latin = out.join("");
  if (rough) latin = latin.startsWith("r") ? `rh${latin.slice(1)}` : `h${latin}`;
  const capital = word[0] !== word[0].toLowerCase();
  return capital ? latin[0].toUpperCase() + latin.slice(1) : latin;
}

export const romanize = (greek: string): string => greek.split(/(\s+)/).map((w) => (/\s/.test(w) ? w : romanizeWord(w))).join("");
