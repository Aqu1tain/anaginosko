import data from "./glosses.json";

export type Gloss = {
  excerpt: string;
  uri: string;
  /** Vedette exacte renvoyée par le lexique (présente sur les futures générations). */
  headword?: string;
};

export type GlossStatus = "verified" | "unverified" | "absent";
export type GlossAssessment = { status: GlossStatus; gloss: Gloss | null };

const glosses = data as Record<string, Gloss>;

// Les anciennes données ne stockent pas la vedette Bailly. Elle reste toutefois
// lisible au début de l'extrait. Accents et esprits sont volontairement
// conservés : ἔλεος (pitié) et ἐλεός (table) ne sont pas interchangeables.
export const normalizeHeadword = (value: string): string =>
  (value ?? "").normalize("NFC").replace(/ϐ/g, "β").replace(/[··]/g, "");

export const excerptHeadword = (excerpt: string): string =>
  normalizeHeadword((excerpt ?? "").split(/[-,;:()\[\]\s]/)[0] ?? "");

export function assessGloss(
  lemma: string | null | undefined,
  gloss: Gloss | null | undefined,
): GlossAssessment {
  if (!lemma || !gloss?.excerpt?.trim()) return { status: "absent", gloss: null };
  const headword = gloss.headword
    ? normalizeHeadword(gloss.headword)
    : excerptHeadword(gloss.excerpt);
  return headword === normalizeHeadword(lemma)
    ? { status: "verified", gloss }
    : { status: "unverified", gloss: null };
}

/** Glose bundlée et vérifiée (passages d'accueil et métadonnées hors corpus). */
export const glossFor = (lemma: string | null | undefined): Gloss | undefined =>
  lemma && assessGloss(lemma, glosses[lemma]).status === "verified" ? glosses[lemma] : undefined;

/** Donnée brute uniquement pour initialiser le chargeur corpus-aware. */
export const bundledGlossFor = (lemma: string | null | undefined): Gloss | undefined =>
  lemma ? glosses[lemma] : undefined;
