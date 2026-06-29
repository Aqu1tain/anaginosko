import { BOOK_ORDER, BOOK_NAMES, NT_GROUPS, CORPUS_GROUPS } from "./nt";

// Registre des corpus. Module pur (ni server-only ni "use client") : importé par
// les loaders fs serveur, les loaders fetch client, les pages serveur et les
// composants client. Les valeurs NT reproduisent les littéraux historiques, donc
// tout ce qui passe par la config rend la sortie actuelle à l'identique.

export type SubGroup = { id: string; title: string; short: string; books: string[]; color: string };
export type EditorialGroup = { title: string; ids: string[] };

export type CorpusConfig = {
  id: string; // "nt" | "lxx" — clé du registre
  routePrefix: string; // "/nt" | "/lxx" — base des routes de lecture
  dataPrefix: string; // "nt" | "lxx" — sous-dossier public + chemin fetch client + chemin nginx
  dataDirEnv: string; // "NT_DATA_DIR" | "LXX_DATA_DIR" — override fs serveur
  refPrefix: string; // "nt" | "lxx" — ref d'annotation `${refPrefix}-${book}-${ch}`
  textCollection: string; // "nt" | "lxx" — valeur Text.collection
  concordanceBase: string; // "/concordance" | "/lxx/concordance"
  label: string; // "Nouveau Testament" | "Septante (LXX)"
  shortLabel: string; // "NT" | "LXX"
  sourceLabel: string; // "SBLGNT" | "Rahlfs 1935"
  sourceUrl: string; // isBasedOn (JSON-LD)
  bookOrder: readonly string[];
  bookNames: Record<string, string>;
  editorialGroups: EditorialGroup[]; // regroupement de la table des matières
  subGroups: SubGroup[]; // regroupement/couleurs du profil de répartition
};

export const NT: CorpusConfig = {
  id: "nt",
  routePrefix: "/nt",
  dataPrefix: "nt",
  dataDirEnv: "NT_DATA_DIR",
  refPrefix: "nt",
  textCollection: "nt",
  concordanceBase: "/concordance",
  label: "Nouveau Testament",
  shortLabel: "NT",
  sourceLabel: "SBLGNT",
  sourceUrl: "https://sblgnt.com/",
  bookOrder: BOOK_ORDER,
  bookNames: BOOK_NAMES,
  editorialGroups: NT_GROUPS,
  subGroups: CORPUS_GROUPS,
};

export const CORPORA: CorpusConfig[] = [NT];

const byId = new Map(CORPORA.map((c) => [c.id, c]));

export const corpusById = (id: string): CorpusConfig => byId.get(id) ?? NT;

export const corpusByDataPrefix = (seg: string): CorpusConfig | undefined =>
  CORPORA.find((c) => c.dataPrefix === seg);

export const makeRef = (c: CorpusConfig, book: string, chapter: number): string =>
  `${c.refPrefix}-${book}-${chapter}`;

// Préfixes connus assemblés depuis le registre : une ref est `<prefix>-<book>-<ch>`.
// Contrainte : un id de livre ne finit jamais par `-<chiffres>`.
const refPattern = () => new RegExp(`^(${CORPORA.map((c) => c.refPrefix).join("|")})-(.+)-(\\d+)$`);

export function parseRef(ref: string): { corpus: string; book: string; chapter: number } | null {
  const m = ref.match(refPattern());
  return m ? { corpus: m[1], book: m[2], chapter: Number(m[3]) } : null;
}
