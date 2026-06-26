import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Text } from "../src/data/texts";
import type { NtBook, LemmaEntry, Occ, Distribution, Colloc } from "../src/data/nt";

// Dossier des données NT. Au build (SSG des chapitres) : public/nt. En prod, le
// standalone Next ne contient PAS public/nt (servi par nginx) ; on lit alors
// NT_DATA_DIR (=/var/www/anaginosko/nt) défini dans l'environnement du service.
const ntDir = () => process.env.NT_DATA_DIR || path.join(process.cwd(), "public", "nt");

const readJson = async <T>(rel: string): Promise<T> =>
  JSON.parse(await readFile(path.join(ntDir(), rel), "utf8")) as T;

export async function loadBooksFs(): Promise<NtBook[]> {
  const data = await readJson<{ books: NtBook[] }>("books.json");
  return data.books;
}

// --- Concordance : lecture disque pour le SSR des fiches-lemme ---

let lemmasFsCache: LemmaEntry[] | null = null;

export async function loadLemmasFs(): Promise<LemmaEntry[]> {
  if (!lemmasFsCache) lemmasFsCache = await readJson<LemmaEntry[]>("lemmas.json");
  return lemmasFsCache;
}

export async function lemmaEntryFs(lemma: string): Promise<LemmaEntry | undefined> {
  const index = await loadLemmasFs();
  return index.find((e) => e.lemma === lemma);
}

export const loadOccurrencesFs = (oid: number): Promise<Occ[]> =>
  readJson<Occ[]>(`occ/${oid}.json`);

export const loadDistributionFs = (oid: number): Promise<Distribution> =>
  readJson<Distribution>(`distribution/${oid}.json`).catch(() => ({}) as Distribution);

export const loadCollocationsFs = (oid: number): Promise<Colloc[]> =>
  readJson<Colloc[]>(`colloc/${oid}.json`).catch(() => []);

type FrenchByChapter = Record<string, Record<string, string>>;

export async function loadChapterFs(book: string, chapter: number): Promise<Text> {
  const [data, french] = await Promise.all([
    readJson<{ reference: string; mots: Text["mots"] }>(`${book}/${chapter}.json`),
    readJson<FrenchByChapter>(`${book}/fr.json`).catch(() => null),
  ]);
  return {
    id: `nt-${book}-${chapter}`,
    collection: "nt",
    niveau: 0,
    reference: data.reference,
    grec: "",
    francais: french?.[chapter] ?? null,
    translitErasmien: null,
    translitRestituee: null,
    mots: data.mots,
  };
}
