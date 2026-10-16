import type { KeyTerm } from "@/src/lib/workshopApi";

// Contrôles d'un verset traduit : typographie française et termes clés (un lemme du
// glossaire présent dans le grec doit retrouver l'un de ses rendus admis).

export type Issue = { kind: "typo" | "term"; message: string };

const TYPO: [RegExp, string][] = [
  [/[—–]/, "Tiret long : préférer virgules, deux-points ou parenthèses"],
  [/ {2,}/, "Espace double"],
  [/\s[,.)]/, "Espace avant une virgule, un point ou une parenthèse"],
  [/"/, "Guillemets droits : utiliser « »"],
  [/[^\s  «(][;:!?]/, "Espace manquante avant ; : ! ?"],
  [/[a-zà-ÿ]\.[A-ZÀ-Ý]/, "Espace manquante après un point"],
];

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// « amour » couvre « amours », « amour* » couvre « amoureux » : un rendu se cherche
// en début de mot ; la casse et les accents sont ignorés.
export function hasRendering(text: string, rendering: string): boolean {
  const r = fold(rendering.replace(/\*$/, "")).trim();
  if (!r) return false;
  const escaped = r.replace(/[.+^${}()|[\]\\?]/g, "\\$&");
  return new RegExp(`(^|[^a-z])${escaped}`).test(fold(text));
}

export function checkVerse(text: string, lemmas: string[], terms: Map<string, KeyTerm>): Issue[] {
  if (!text.trim()) return [];
  const issues: Issue[] = TYPO.filter(([re]) => re.test(text)).map(([, message]) => ({ kind: "typo", message }));
  for (const lemma of new Set(lemmas)) {
    const term = terms.get(lemma);
    if (!term?.renderings.length || term.renderings.some((r) => hasRendering(text, r))) continue;
    issues.push({ kind: "term", message: `${lemma} : ${term.renderings.map((r) => `« ${r} »`).join(" ou ")} attendu` });
  }
  return issues;
}
