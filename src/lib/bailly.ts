// Choix de la bonne entrée Bailly pour un lemme. `lookup` renvoie une recherche
// floue (ὁ → la lettre Ο, le préfixe ὀ-, l'article ὁ, le relatif ὅ…) toutes
// marquées isExact ; le seul discriminant fiable est le mot-vedette. On prend
// l'entrée dont la vedette est EXACTEMENT le lemme (esprits et accents compris).
// Jumeau TS de scripts/lib/bailly-pick.mjs (la frontière script .mjs / runtime
// empêche un import partagé).

export type BaillyEntry = {
  uri: string;
  word?: string;
  excerpt?: string;
  isExact?: boolean;
  isMorpheus?: boolean;
};

// NFC, bêta médial bouclé (ϐ) → β, points de composition (ἀνα·βαίνω) retirés.
const normHead = (s: string) =>
  (s ?? "").normalize("NFC").replace(/ϐ/g, "β").replace(/[··]/g, "");

// « ὁ, ἡ, τό » → [ὁ, ἡ, τό] ; « ἀγαπάω-ῶ » → [ἀγαπάω].
const headForms = (e: BaillyEntry) =>
  (e.word ?? "").split(/[,;]/).map((seg) => normHead(seg.trim().split("-")[0]));

export function pickBaillyEntry(entries: BaillyEntry[], lemma: string): BaillyEntry | undefined {
  if (!entries.length) return undefined;
  const target = normHead(lemma);
  const matches = (e: BaillyEntry) => headForms(e).includes(target);
  // Un résultat flou est pire qu'une définition absente : accents et esprits
  // distinguent notamment ἔλεος (pitié) d'ἐλεός (table).
  return entries.find((e) => matches(e) && !e.isMorpheus) || entries.find(matches);
}

type DefEntry = { definition?: string; children?: DefEntry[] };

// Définition d'une entrée renvoyée par /entry. Pour certains mots (le relatif ὅς,
// etc.) la définition de tête est vide et le texte vit dans `children` ; on
// descend donc jusqu'à la première définition non vide.
export function baillyDefinition(entry: DefEntry | null | undefined): string {
  if (!entry) return "";
  if (entry.definition?.trim()) return entry.definition;
  // Une entrée-conteneur peut commencer par un simple renvoi (« fém. de… » ou
  // « posé par erreur… ») avant la vraie notice. La notice la plus substantielle
  // est un meilleur repli déterministe que « le premier enfant ».
  return (entry.children ?? [])
    .map(baillyDefinition)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)[0] ?? "";
}
