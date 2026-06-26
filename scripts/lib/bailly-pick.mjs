// Choix de la bonne entrée Bailly pour un lemme. L'API `lookup` renvoie une
// recherche floue (ὁ → 95 entrées : la lettre Ο, le préfixe ὀ-, l'article ὁ, le
// relatif ὅ…), toutes marquées isExact. Le seul discriminant fiable est le
// mot-vedette : on prend l'entrée dont la vedette est EXACTEMENT le lemme
// (esprits et accents compris), sinon on retombe sur l'heuristique précédente.

// Normalise une vedette pour la comparer à un lemme : NFC, bêta médial bouclé
// (ϐ, U+03D0) → β, et on retire les points de composition (ἀνα·βαίνω → ἀναβαίνω).
export function normHead(s) {
  return (s ?? "").normalize("NFC").replace(/ϐ/g, "β").replace(/[··]/g, "");
}

// Vedettes d'une entrée : « ὁ, ἡ, τό » → [ὁ, ἡ, τό] ; « ἀγαπάω-ῶ » → [ἀγαπάω]
// (on garde la forme de base, sans le -ῶ contracté).
function headForms(entry) {
  return (entry.word ?? "")
    .split(/[,;]/)
    .map((seg) => normHead(seg.trim().split("-")[0]));
}

// La vedette de l'entrée est-elle exactement le lemme ? (vrai = glose fiable)
export function isHeadMatch(entry, lemma) {
  return !!entry && headForms(entry).includes(normHead(lemma));
}

export function pickEntry(entries, lemma) {
  if (!entries?.length) return null;
  const target = normHead(lemma);
  const matches = (e) => headForms(e).includes(target);
  return (
    entries.find((e) => matches(e) && !e.isMorpheus) ||
    entries.find((e) => matches(e)) ||
    entries.find((e) => e.isExact && !e.isMorpheus) ||
    entries.find((e) => !e.isMorpheus) ||
    entries[0]
  );
}

// La vedette stockée (déduite de l'excerpt) correspond-elle au lemme ? Sert à
// repérer les gloses à recorriger sans réinterroger toute l'API.
export function headOfExcerpt(excerpt) {
  return normHead((excerpt ?? "").split(/[-,;:()\[\]\s]/)[0] ?? "");
}
