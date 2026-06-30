import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Text } from "../src/data/texts";
import type { NtBook, LemmaEntry, Occ, Distribution, Colloc } from "../src/data/nt";
import type { CorpusConfig } from "../src/data/corpus";

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

export async function lemmaEntryFs(lemma: string, c?: CorpusConfig): Promise<LemmaEntry | undefined> {
  const index = await loadLemmasFs(c);
  return index.find((e) => e.lemma === lemma);
}

export const loadOccurrencesFs = (oid: number, c?: CorpusConfig): Promise<Occ[]> =>
  readJson<Occ[]>(`occ/${oid}.json`, c);

export const loadDistributionFs = (oid: number, c?: CorpusConfig): Promise<Distribution> =>
  readJson<Distribution>(`distribution/${oid}.json`, c).catch(() => ({}) as Distribution);

export const loadCollocationsFs = (oid: number, c?: CorpusConfig): Promise<Colloc[]> =>
  readJson<Colloc[]>(`colloc/${oid}.json`, c).catch(() => []);

type FrenchByChapter = Record<string, Record<string, string>>;

// Chapitres dont la traduction n'est pas appariable verset par verset (manifeste
// `_align` écrit par realign-lxx-french). `undefined` = pas de manifeste → le
// lecteur retombe sur son heuristique.
function blockedChapter(french: FrenchByChapter | null, chapter: number): boolean | undefined {
  const align = (french as { _align?: { blocks?: number[] } } | null)?._align;
  if (!align) return undefined;
  return (align.blocks ?? []).includes(chapter);
}

export async function loadChapterFs(book: string, chapter: number, c?: CorpusConfig): Promise<Text> {
  const [data, french] = await Promise.all([
    readJson<{ reference: string; mots: Text["mots"] }>(`${book}/${chapter}.json`, c),
    readJson<FrenchByChapter>(`${book}/fr.json`, c).catch(() => null),
  ]);
  return {
    id: `${c?.refPrefix ?? "nt"}-${book}-${chapter}`,
    collection: c?.textCollection ?? "nt",
    niveau: 0,
    reference: data.reference,
    grec: "",
    francais: french?.[chapter] ?? null,
    frenchBlock: blockedChapter(french, chapter),
    translitErasmien: null,
    translitRestituee: null,
    mots: data.mots,
  };
}
