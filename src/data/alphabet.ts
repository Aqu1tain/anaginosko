// Alphabet, diphtongues, esprits, accents et ponctuation.
// Source : cours « Introduction au grec biblique » (prononciation érasmienne et restituée de la koinè).

export type Letter = {
  upper: string;
  lower: string;
  /** forme alternative en minuscule (ex. sigma final ς) */
  final?: string;
  /** clés minuscules de base (sans diacritiques) qui pointent vers cette lettre */
  keys: string[];
  name: string;
  /** équivalent latin / valeur de translittération */
  latin: string;
  erasmien: string;
  restituee: string;
  note?: string;
};

export const letters: Letter[] = [
  { upper: "Α", lower: "α", keys: ["α"], name: "Alpha", latin: "a", erasmien: "a", restituee: "a" },
  { upper: "Β", lower: "β", keys: ["β"], name: "Bêta", latin: "b", erasmien: "b", restituee: "b ou v" },
  { upper: "Γ", lower: "γ", keys: ["γ"], name: "Gamma", latin: "g", erasmien: "g dur", restituee: "g", note: "Nasale (« ng ») devant κ, γ, χ." },
  { upper: "Δ", lower: "δ", keys: ["δ"], name: "Delta", latin: "d", erasmien: "d", restituee: "d" },
  { upper: "Ε", lower: "ε", keys: ["ε"], name: "Epsilon", latin: "e", erasmien: "é bref (fermé)", restituee: "e" },
  { upper: "Ζ", lower: "ζ", keys: ["ζ"], name: "Dzêta", latin: "z", erasmien: "dz", restituee: "z" },
  { upper: "Η", lower: "η", keys: ["η"], name: "Êta", latin: "ê", erasmien: "ê (è ouvert long)", restituee: "ê (ou i)" },
  { upper: "Θ", lower: "θ", keys: ["θ"], name: "Thêta", latin: "th", erasmien: "t", restituee: "th aspiré (th anglais)" },
  { upper: "Ι", lower: "ι", keys: ["ι"], name: "Iota", latin: "i", erasmien: "i", restituee: "i" },
  { upper: "Κ", lower: "κ", keys: ["κ"], name: "Kappa", latin: "k", erasmien: "k", restituee: "k" },
  { upper: "Λ", lower: "λ", keys: ["λ"], name: "Lambda", latin: "l", erasmien: "l", restituee: "l" },
  { upper: "Μ", lower: "μ", keys: ["μ"], name: "Mu", latin: "m", erasmien: "m", restituee: "m" },
  { upper: "Ν", lower: "ν", keys: ["ν"], name: "Nu", latin: "n", erasmien: "n", restituee: "n" },
  { upper: "Ξ", lower: "ξ", keys: ["ξ"], name: "Xi", latin: "x", erasmien: "ks", restituee: "ks" },
  { upper: "Ο", lower: "ο", keys: ["ο"], name: "Omicron", latin: "o", erasmien: "o bref (fermé)", restituee: "o" },
  { upper: "Π", lower: "π", keys: ["π"], name: "Pi", latin: "p", erasmien: "p", restituee: "p" },
  { upper: "Ρ", lower: "ρ", keys: ["ρ"], name: "Rhô", latin: "r", erasmien: "r roulé", restituee: "r roulé", note: "En début de mot, le rhô porte un esprit rude : « rh » en érasmien, « r » en restituée." },
  { upper: "Σ", lower: "σ", final: "ς", keys: ["σ", "ς"], name: "Sigma", latin: "s", erasmien: "s", restituee: "s", note: "Forme finale ς en fin de mot, σ ailleurs." },
  { upper: "Τ", lower: "τ", keys: ["τ"], name: "Tau", latin: "t", erasmien: "t", restituee: "t" },
  { upper: "Υ", lower: "υ", keys: ["υ"], name: "Upsilon", latin: "u", erasmien: "u (ü)", restituee: "u" },
  { upper: "Φ", lower: "φ", keys: ["φ"], name: "Phi", latin: "ph", erasmien: "f", restituee: "f (ph)" },
  { upper: "Χ", lower: "χ", keys: ["χ"], name: "Khi", latin: "kh", erasmien: "k", restituee: "kh aspiré" },
  { upper: "Ψ", lower: "ψ", keys: ["ψ"], name: "Psi", latin: "ps", erasmien: "ps", restituee: "ps" },
  { upper: "Ω", lower: "ω", keys: ["ω"], name: "Ôméga", latin: "ô", erasmien: "ô long (ouvert)", restituee: "ô (long)" },
];

export type Diphthong = {
  greek: string;
  erasmien: string;
  restituee: string;
};

export const diphthongs: Diphthong[] = [
  { greek: "αυ", erasmien: "au", restituee: "av / af" },
  { greek: "ευ", erasmien: "eu", restituee: "év / éf" },
  { greek: "ου", erasmien: "ou", restituee: "ou" },
  { greek: "αι", erasmien: "aï", restituee: "é" },
  { greek: "ει", erasmien: "éï", restituee: "i" },
  { greek: "οι", erasmien: "oï", restituee: "u" },
];

export type Spirit = {
  sign: string;
  name: string;
  description: string;
  example: string;
};

export const spirits: Spirit[] = [
  {
    sign: "᾿",
    name: "Esprit doux",
    description: "Aucune aspiration. Se place sur la première voyelle (ou le rhô) du mot.",
    example: "ἐγώ",
  },
  {
    sign: "῾",
    name: "Esprit rude",
    description: "Aspiration « h » sur la première voyelle. Ces mots prennent un « h » en français (ὕδωρ → hydro-).",
    example: "ἡμέρα",
  },
];

export type Accent = {
  sign: string;
  name: string;
  description: string;
  example: string;
};

export const accents: Accent[] = [
  { sign: "´", name: "Accent aigu", description: "Le plus courant. La voix appuie sur la syllabe. Se place sur toutes les voyelles.", example: "λόγος" },
  { sign: "`", name: "Accent grave", description: "Un aigu transformé : sur la dernière syllabe quand un autre mot accentué suit.", example: "καὶ" },
  { sign: "῀", name: "Accent circonflexe", description: "Seulement sur voyelles longues (η, ω) ou longues possibles (α, ι, υ) et diphtongues.", example: "δῶρον" },
];

export type Punctuation = {
  sign: string;
  name: string;
  meaning: string;
};

export const punctuation: Punctuation[] = [
  { sign: ".", name: "Point", meaning: "Point final, comme en français." },
  { sign: ",", name: "Virgule", meaning: "Virgule, comme en français." },
  { sign: "·", name: "Point en hauteur", meaning: "Point-virgule ou deux-points." },
  { sign: ";", name: "Point d’interrogation", meaning: "Le point-virgule grec marque la question." },
];
