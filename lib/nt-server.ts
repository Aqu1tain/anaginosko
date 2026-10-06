import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Text } from "../src/data/texts";
import { bookById, chapterNumbers, type NtBook, type LemmaEntry, type Occ, type Distribution, type Colloc } from "../src/data/nt";
import type { CorpusConfig } from "../src/data/corpus";
import { ntMaison } from "./ntMaison";
import {
  assessGloss,
  type Gloss,
  type GlossAssessment,
} from "../src/data/glosses";

// Dossier des données d'un corpus. Au build (SSG des chapitres) : public/<prefix>.
// En prod, le standalone Next ne contient PAS ces données (servies par nginx) ;
// on lit alors la variable d'env du corpus (NT_DATA_DIR=/var/www/anaginosko/nt,
// LXX_DATA_DIR=...). `corpus` omis = comportement NT historique.
const corpusDir = (c?: CorpusConfig) =>
  process.env[c?.dataDirEnv ?? "NT_DATA_DIR"] ||
  path.join(process.cwd(), "public", c?.dataPrefix ?? "nt");

const readJson = async <T>(rel: string, c?: CorpusConfig): Promise<T> =>
  JSON.parse(await readFile(path.join(corpusDir(c), rel), "utf8")) as T;

export async function loadBooksFs(c?: CorpusConfig): Promise<NtBook[]> {
  const data = await readJson<{ books: NtBook[] }>("books.json", c);
  return data.books;
}

// --- Concordance : lecture disque pour le SSR des fiches-lemme ---

const lemmasFsCache = new Map<string, LemmaEntry[]>();

export async function loadLemmasFs(c?: CorpusConfig): Promise<LemmaEntry[]> {
  const key = c?.id ?? "nt";
  const cached = lemmasFsCache.get(key);
  if (cached) return cached;
  const index = await readJson<LemmaEntry[]>("lemmas.json", c);
  lemmasFsCache.set(key, index);
  return index;
}

export function decodeParam(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

export async function lemmaEntryFs(lemma: string, c?: CorpusConfig): Promise<LemmaEntry | undefined> {
  const index = await loadLemmasFs(c);
  return index.find((e) => e.lemma === lemma);
}

export const loadOccurrencesFs = (oid: number, c?: CorpusConfig): Promise<Occ[]> =>
  readJson<Occ[]>(`occ/${oid}.json`, c);

const BOOK_OCC_CAP = 500;

// Occurrences d'un lemme dans un seul livre, relues dans ses chapitres : les fichiers
// occ/ s'arrêtent aux 500 premières du corpus entier, et laissent vides les livres
// tardifs des mots fréquents. Même repère de mot que le build (mot n -> jeton 2n).
export async function loadBookOccurrencesFs(lemma: string, bookId: string, c?: CorpusConfig): Promise<Occ[] | null> {
  const book = bookById(await loadBooksFs(c), bookId);
  if (!book) return null;
  const out: Occ[] = [];
  for (const ch of chapterNumbers(book)) {
    const { mots } = await readJson<{ mots: { grec: string; lemme: string | null; verse: number | null }[] }>(`${bookId}/${ch}.json`, c);
    mots.forEach((m, i) => {
      if (m.lemme === lemma && out.length < BOOK_OCC_CAP) out.push({ b: bookId, c: ch, v: m.verse ?? 0, w: i * 2, f: m.grec });
    });
    if (out.length >= BOOK_OCC_CAP) break;
  }
  return out;
}

export const loadDistributionFs = (oid: number, c?: CorpusConfig): Promise<Distribution> =>
  readJson<Distribution>(`distribution/${oid}.json`, c).catch(() => ({}) as Distribution);

export const loadCollocationsFs = (oid: number, c?: CorpusConfig): Promise<Colloc[]> =>
  readJson<Colloc[]>(`colloc/${oid}.json`, c).catch(() => []);

const glossesFsCache = new Map<string, Record<string, Gloss>>();

/** Glose du bon corpus, validée par sa vedette avant exposition publique. */
export async function loadGlossFs(lemma: string, c?: CorpusConfig): Promise<GlossAssessment> {
  const key = c?.id ?? "nt";
  let glosses = glossesFsCache.get(key);
  if (!glosses) {
    glosses = await readJson<Record<string, Gloss>>("glosses.json", c).catch(() => ({}));
    glossesFsCache.set(key, glosses);
  }
  return assessGloss(lemma, glosses[lemma]);
}

type FrenchByChapter = Record<string, Record<string, string>>;

// Chapitres dont la traduction n'est pas appariable verset par verset (manifeste
// `_align` écrit par realign-lxx-french). `undefined` = pas de manifeste → le
// lecteur retombe sur son heuristique.
function blockedChapter(french: FrenchByChapter | null, chapter: number): boolean | undefined {
  const align = (french as { _align?: { blocks?: number[] } } | null)?._align;
  if (!align) return undefined;
  return (align.blocks ?? []).includes(chapter);
}

export const loadFrenchFs = (book: string, c?: CorpusConfig): Promise<FrenchByChapter | null> =>
  readJson<FrenchByChapter>(`${book}/fr.json`, c).catch(() => null);

export async function loadChapterFs(book: string, chapter: number, c?: CorpusConfig): Promise<Text> {
  const [data, french] = await Promise.all([
    readJson<{ reference: string; mots: Text["mots"] }>(`${book}/${chapter}.json`, c),
    readJson<FrenchByChapter>(`${book}/fr.json`, c).catch(() => null),
  ]);
  // Crédits des traductions maison de CE chapitre : "ch:v" -> traducteur.
  const maisonAll = (french as { _maison?: Record<string, string> } | null)?._maison || {};
  const maison: Record<string, string> = {};
  for (const k of Object.keys(maisonAll)) { const [mc, mv] = k.split(":"); if (mc === String(chapter)) maison[mv] = maisonAll[k]; }
  const francais = { ...(french?.[chapter] ?? {}) };
  // NT : les traductions maison (base de l'API) remplacent le néo-Crampon verset par verset.
  if ((c?.id ?? "nt") === "nt") {
    for (const [ref, entry] of Object.entries((await ntMaison())[book] ?? {})) {
      const [mc, mv] = ref.split(":");
      if (mc !== String(chapter)) continue;
      francais[mv] = entry.maison;
      maison[mv] = entry.by;
    }
  }
  return {
    id: `${c?.refPrefix ?? "nt"}-${book}-${chapter}`,
    collection: c?.textCollection ?? "nt",
    niveau: 0,
    reference: data.reference,
    grec: "",
    francais: Object.keys(francais).length ? francais : null,
    maison: Object.keys(maison).length ? maison : null,
    frenchBlock: blockedChapter(french, chapter),
    translitErasmien: null,
    translitRestituee: null,
    mots: data.mots,
  };
}
