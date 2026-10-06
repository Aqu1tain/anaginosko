import data from "./glosses.json";

export type Gloss = {
  excerpt: string;
  uri: string;
  /** Vedette exacte renvoyée par le lexique (présente sur les futures générations). */
  headword?: string;
};

export type GlossStatus = "verified" | "unverified" | "absent";
// `via` : vedette du Bailly quand elle diffère du lemme (actif d'un verbe moyen,
// graphie attique), pour le signaler au lecteur.
export type GlossAssessment = { status: GlossStatus; gloss: Gloss | null; via?: string };

const glosses = data as Record<string, Gloss>;

// Les anciennes données ne stockent pas la vedette Bailly. Elle reste toutefois
// lisible au début de l'extrait. Accents et esprits sont volontairement
// conservés : ἔλεος (pitié) et ἐλεός (table) ne sont pas interchangeables.
export const normalizeHeadword = (value: string): string =>
  (value ?? "").normalize("NFC").replace(/ϐ/g, "β").replace(/[··]/g, "");

export const excerptHeadword = (excerpt: string): string =>
  normalizeHeadword((excerpt ?? "").split(/[-,;:()\[\]\s]/)[0] ?? "");

// Clé de comparaison : astérisque du Bailly et iota souscrit ignorés, accents et
// esprits gardés.
const compareKey = (value: string): string =>
  normalizeHeadword(value).replace(/^\*/, "").normalize("NFD").replace(/\u0345/g, "").normalize("NFC");

// Formes sous lesquelles le Bailly range un lemme : le lemme lui-même, l'actif d'un
// verbe moyen (ἐκλέγομαι, rangé à ἐκλέγω) et la graphie attique des composés de
// γίνομαι (ἐπιγίνομαι, rangé à ἐπιγίγνομαι).
export const headwordCandidates = (lemma: string): string[] => {
  const l = lemma.normalize("NFC");
  return [...new Set([l, l.replace(/ομαι$/, "ω"), l.replace(/γίνομαι$/, "γίγνομαι")].map(compareKey))];
};

export function assessGloss(
  lemma: string | null | undefined,
  gloss: Gloss | null | undefined,
): GlossAssessment {
  if (!lemma || !gloss?.excerpt?.trim()) return { status: "absent", gloss: null };
  const headword = gloss.headword
    ? normalizeHeadword(gloss.headword)
    : excerptHeadword(gloss.excerpt);
  const key = compareKey(headword);
  if (!headwordCandidates(lemma).includes(key)) return { status: "unverified", gloss: null };
  return key === compareKey(lemma) ? { status: "verified", gloss } : { status: "verified", gloss, via: headword.replace(/^\*/, "") };
}

/** Glose bundlée et vérifiée (passages d'accueil et métadonnées hors corpus). */
export const glossFor = (lemma: string | null | undefined): Gloss | undefined =>
  lemma && assessGloss(lemma, glosses[lemma]).status === "verified" ? glosses[lemma] : undefined;

/** Donnée brute uniquement pour initialiser le chargeur corpus-aware. */
export const bundledGlossFor = (lemma: string | null | undefined): Gloss | undefined =>
  lemma ? glosses[lemma] : undefined;
