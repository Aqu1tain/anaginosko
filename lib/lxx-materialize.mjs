// Matérialisation PAR-REF, source unique de vérité. Concatène les sources d'un
// lien (verset Giguet entier [ch,v] ou extrait de mots [ch,v,de,à]) en le texte
// français servi pour un verset grec. Aucune I/O : prend le livre Giguet
// (ch -> v -> texte) et les sources. Importé par lib/arbitration.ts (runtime),
// scripts/apply-overrides.mjs et scripts/materialize-links.mjs : un seul
// instrument, la divergence par-ref devient inexprimable.

export function giguetWords(gbook, ch, v) {
  const t = gbook?.[String(ch)]?.[String(v)];
  return t == null ? null : t.split(/\s+/).filter(Boolean);
}

export function sliceSource(gbook, s) {
  if (s.length === 2) return gbook?.[String(s[0])]?.[String(s[1])] ?? null;
  const words = giguetWords(gbook, s[0], s[1]);
  if (!words) return null;
  return words.slice(s[2], s[3] + 1).join(" ");
}

export function materializeSources(gbook, sources) {
  return sources.map((s) => sliceSource(gbook, s)).filter(Boolean).join(" ").trim();
}

// Grammaire STRICTE de marqueur (full-match sur le segment joint). Sert à décider
// si une plage Giguet non couverte est un marqueur/ponctuation (exclu, raison
// nommée) ou de l'Écriture (ré-émise en orphelin). Principe : échouer dans le sens
// VISIBLE — en cas de doute, ce n'est PAS un marqueur (orphelin ré-émis, vu à la
// revue), jamais l'inverse (Écriture perdue sans témoin). Romains en MAJUSCULES
// seulement (pas de flag i) : « il », « dix », « civil », « mil », « vil », « midi »
// restent du contenu ; « (26) », « (Vulg., XXXIV.) », « XII. », « . », « - » = marqueurs.
const MARKER_ROMAN = /^\(?(?:Vulg\.?,?\s*)?[IVXLCDM]+[.,]?\)?$/;
const MARKER_ARABIC_PAREN = /^\((?:Vulg\.?,?\s*)?\d+[.,]?\)$/;
const MARKER_ARABIC_DOT = /^(?:Vulg\.?,?\s*)?\d+[.,]$/;
const MARKER_PUNCT = /^[.,;:…«»"'—-]+$/;

export function isMarkerSegment(text) {
  const t = String(text).trim();
  return MARKER_ROMAN.test(t) || MARKER_ARABIC_PAREN.test(t) || MARKER_ARABIC_DOT.test(t) || MARKER_PUNCT.test(t);
}

export function markerReason(text) {
  return MARKER_PUNCT.test(String(text).trim()) ? "ponctuation" : "marqueur";
}
