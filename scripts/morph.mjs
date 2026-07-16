// Décode le code morphologique MorphGNT (8 caractères) en analyse française.
// Positions : personne, temps, voix, mode, cas, nombre, genre, degré.

const PERSON = { "1": "1ʳᵉ", "2": "2ᵉ", "3": "3ᵉ" };
const TENSE = { P: "présent", I: "imparfait", F: "futur", A: "aoriste", X: "parfait", Y: "plus-que-parfait" };
const VOICE = { A: "actif", M: "moyen", P: "passif" };
const MOOD = { I: "indicatif", D: "impératif", S: "subjonctif", O: "optatif", N: "infinitif", P: "participe" };
const CASE = { N: "nominatif", G: "génitif", D: "datif", A: "accusatif", V: "vocatif" };
const NUMBER = { S: "singulier", P: "pluriel", D: "duel" };
const GENDER = { M: "masculin", F: "féminin", N: "neutre" };
const DEGREE = { C: "comparatif", S: "superlatif" };

export function decodeMorph(parse) {
  if (!parse || /^-+$/.test(parse)) return null;
  const c = parse.split("");
  const person = PERSON[c[0]], tense = TENSE[c[1]], voice = VOICE[c[2]], mood = MOOD[c[3]];
  const kase = CASE[c[4]], number = NUMBER[c[5]], gender = GENDER[c[6]], degree = DEGREE[c[7]];
  const nominal = [kase, gender, number].filter(Boolean).join(" ");

  if (mood === "participe") {
    const head = ["participe", tense, voice].filter(Boolean).join(" ");
    return [head, nominal].filter(Boolean).join(", ");
  }
  if (mood === "infinitif") {
    return ["infinitif", tense, voice].filter(Boolean).join(" ");
  }
  if (mood) {
    const pers = [person && `${person} pers.`, number].filter(Boolean).join(" ");
    const verbal = [tense, mood, voice].filter(Boolean).join(" ");
    return [pers, verbal].filter(Boolean).join(", ");
  }
  return (nominal ? nominal + (degree ? `, ${degree}` : "") : null) || null;
}

// Adapte un code CCAT/Tauber compact (LXX Rahlfs : POS + parse, ex. « V.AAI3S »,
// « N.DSF ») vers les 8 positions MorphGNT, puis réutilise decodeMorph pour la
// même analyse française que le NT. Verbe : tense, voix, mode (+pers, nb / +cas,
// nb, genre pour le participe). Nominal : cas, nombre, genre (+degré).
const NOMINAL_POS = new Set(["N", "A", "RA", "RD", "RI", "RP", "RR", "RX", "M"]);

export function decodeMorphCcat(pos, parse) {
  if (!parse) return null;
  const s = ["-", "-", "-", "-", "-", "-", "-", "-"]; // pers,tense,voix,mode,cas,nb,genre,degré
  if (pos === "V") {
    s[1] = parse[0] ?? "-";
    s[2] = parse[1] ?? "-";
    s[3] = parse[2] ?? "-";
    if (parse[2] === "P") {
      s[4] = parse[3] ?? "-";
      s[5] = parse[4] ?? "-";
      s[6] = parse[5] ?? "-";
    } else if (parse[2] !== "N") {
      s[0] = parse[3] ?? "-";
      s[5] = parse[4] ?? "-";
    }
  } else if (NOMINAL_POS.has(pos)) {
    s[4] = parse[0] ?? "-";
    s[5] = parse[1] ?? "-";
    s[6] = parse[2] ?? "-";
    if (parse[3]) s[7] = parse[3];
  } else {
    return null;
  }
  return decodeMorph(s.join(""));
}
