// Choix de la bonne entrée Bailly pour un lemme. L'API `lookup` renvoie une
// recherche floue (ὁ → 95 entrées : la lettre Ο, le préfixe ὀ-, l'article ὁ, le
// relatif ὅ…), toutes marquées isExact. Le seul discriminant fiable est le
// mot-vedette : on prend l'entrée dont la vedette est EXACTEMENT le lemme
// (esprits et accents compris). Sans correspondance exacte, on ne publie rien.

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
  return entries.find((e) => matches(e) && !e.isMorpheus) || entries.find(matches) || null;
}

// Les homonymes sont parfois regroupés sous une entrée-conteneur sans extrait.
// On retient alors l'enfant exact le plus substantiel : cela évite le premier
// renvoi éditorial (« fém. de… », « posé par erreur… ») vu pour ἡμέρα et λέγω.
export function pickBestExcerpt(entry, lemma) {
  const candidates = [];
  const visit = (node) => {
    if (isHeadMatch(node, lemma) && node.excerpt?.trim()) candidates.push(node);
    for (const child of node.children ?? []) visit(child);
  };
  if (entry) visit(entry);
  return candidates.reduce((best, current) => {
    if (!best) return current;
    // En cas d'égalité (extraits API tronqués à la même taille), le dernier sens
    // substantiel du conteneur est préféré aux renvois placés en tête.
    return current.excerpt.trim().length >= best.excerpt.trim().length ? current : best;
  }, null);
}

// La vedette stockée (déduite de l'excerpt) correspond-elle au lemme ? Sert à
// repérer les gloses à recorriger sans réinterroger toute l'API.
export function headOfExcerpt(excerpt) {
  return normHead((excerpt ?? "").split(/[-,;:()\[\]\s]/)[0] ?? "");
}
