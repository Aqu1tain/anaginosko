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
