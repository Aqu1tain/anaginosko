import { texts, type Text } from "../data/texts";

export type Occurrence = {
  textId: string;
  reference: string;
  verse: number | null;
  forme: string;
  /** index de jeton du mot dans le texte (pour le surlignage). */
  w: number;
};

export type LemmaEntry = {
  lemma: string;
  nature: string;
  count: number;
  forms: string[];
  occurrences: Occurrence[];
};

const EDGE_PUNCT = /^[\s.,··;:()[\]«»·‧⸀⸂⸃⸄⸅’ʼ'"]+|[\s.,··;:()[\]«»·‧⸀⸂⸃⸄⸅’ʼ'"]+$/gu;

const cleanForm = (s: string): string => s.replace(EDGE_PUNCT, "");

let cache: LemmaEntry[] | null = null;

/** Construit la concordance (lemme -> occurrences) à partir du corpus. */
export function concordance(): LemmaEntry[] {
  if (cache) return cache;

  const map = new Map<string, LemmaEntry>();
  for (const t of texts as Text[]) {
    (t.mots ?? []).forEach((mot, i) => {
      if (!mot.lemme) return;
      let entry = map.get(mot.lemme);
      if (!entry) {
        entry = {
          lemma: mot.lemme,
          nature: mot.nature ?? "Autre",
          count: 0,
          forms: [],
          occurrences: [],
        };
        map.set(mot.lemme, entry);
      }
      const forme = cleanForm(mot.grec);
      entry.count += 1;
      if (!entry.forms.includes(forme)) entry.forms.push(forme);
      // tokenizeText intercale un espace entre les mots : le mot i est au jeton 2*i.
      entry.occurrences.push({
        textId: t.id,
        reference: t.reference,
        verse: mot.verse,
        forme,
        w: i * 2,
      });
    });
  }

  cache = [...map.values()].sort((a, b) => a.lemma.localeCompare(b.lemma, "el"));
  return cache;
}

const NO_ACCENT = /[̀-ͯ]/g;
const fold = (s: string): string => s.normalize("NFD").replace(NO_ACCENT, "").toLowerCase();

/** Recherche tolérante aux accents, sur le lemme ou ses formes. */
export function searchLemmas(query: string): LemmaEntry[] {
  const all = concordance();
  const q = fold(query.trim());
  if (!q) return all;
  return all.filter(
    (e) => fold(e.lemma).includes(q) || e.forms.some((f) => fold(f).includes(q)),
  );
}

export const lemmaByKey = (lemma: string): LemmaEntry | undefined =>
  concordance().find((e) => e.lemma === lemma);
