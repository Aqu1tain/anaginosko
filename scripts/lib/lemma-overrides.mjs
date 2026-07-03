// Corrections de lemmatisation LXX (data/lxx-lemma-overrides.json), partagees
// entre build-lxx.mjs (appliquees a la source, pendant la lemmatisation, pour que
// lemmes/occ/distribution/collocations soient corrects des le rebuild) et
// apply-lemma-overrides.mjs (patch a chaud des donnees deja baties, sans rebuild).
// Une seule logique de matching -> pas de derive entre les deux chemins.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const NFC = (s) => (s ?? "").normalize("NFC");
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export function loadLemmaOverrides() {
  const p = path.join(repo, "data/lxx-lemma-overrides.json");
  if (!fs.existsSync(p)) return [];
  return (JSON.parse(fs.readFileSync(p, "utf8")).rules || []).map((r) => ({
    id: r.id,
    form: NFC(r.match.form),
    fromLemma: NFC(r.match.lemma),
    except: new Set(r.exceptBooks || []),
    set: r.set || {},
  }));
}

// Premiere regle qui matche (forme + lemme courant, livre non exclu) : renvoie le
// lemme/nature/morph corriges. Sinon renvoie les valeurs d'origine, inchangees.
export function correctLemma(rules, bookId, grec, lemme, nature, morph) {
  for (const r of rules) {
    if (r.except.has(bookId)) continue;
    if (NFC(grec) !== r.form || NFC(lemme) !== r.fromLemma) continue;
    return {
      lemme: r.set.lemma ?? lemme,
      nature: r.set.nature ?? nature,
      morph: r.set.morph ?? morph,
      hit: true,
    };
  }
  return { lemme, nature, morph, hit: false };
}
