import type { EditorialGroup, SubGroup } from "./corpus";

// Métadonnées d'affichage de la Septante (le build écrit public/lxx/* ; ici, ce
// qu'il faut côté bundle pour les titres synchrones, la table des matières et les
// couleurs de répartition). Le classement canonique en trois tiers est le produit
// (cf. docs/septante-canon.md) : proto / deutero (canon catholique) / surnuméraires.

export const LXX_BOOK_ORDER = [
  "gen", "exo", "lev", "num", "deu",
  "jos", "jdg", "rut", "1sa", "2sa", "1ki", "2ki", "1ch", "2ch", "esd", "neh", "est",
  "job", "psa", "pro", "ecc", "sng",
  "hos", "amo", "mic", "jol", "oba", "jon", "nam", "hab", "zep", "hag", "zec", "mal",
  "isa", "jer", "lam", "ezk", "dan",
  "tob", "jdt", "1ma", "2ma", "wis", "sir", "bar", "lje", "sus", "bel",
  "1es", "3ma", "4ma", "oda", "pss", "ps151",
] as const;

export const LXX_BOOK_NAMES: Record<string, string> = {
  gen: "Genèse", exo: "Exode", lev: "Lévitique", num: "Nombres", deu: "Deutéronome",
  jos: "Josué", jdg: "Juges", rut: "Ruth", "1sa": "1 Samuel", "2sa": "2 Samuel",
  "1ki": "1 Rois", "2ki": "2 Rois", "1ch": "1 Chroniques", "2ch": "2 Chroniques",
  esd: "Esdras", neh: "Néhémie", est: "Esther",
  job: "Job", psa: "Psaumes", pro: "Proverbes", ecc: "Ecclésiaste", sng: "Cantique des cantiques",
  hos: "Osée", amo: "Amos", mic: "Michée", jol: "Joël", oba: "Abdias", jon: "Jonas",
  nam: "Nahum", hab: "Habacuc", zep: "Sophonie", hag: "Aggée", zec: "Zacharie", mal: "Malachie",
  isa: "Isaïe", jer: "Jérémie", lam: "Lamentations", ezk: "Ézéchiel", dan: "Daniel",
  tob: "Tobie", jdt: "Judith", "1ma": "1 Maccabées", "2ma": "2 Maccabées", wis: "Sagesse",
  sir: "Siracide", bar: "Baruch", lje: "Lettre de Jérémie", sus: "Suzanne", bel: "Bel et le Dragon",
  "1es": "Esdras A'", "3ma": "3 Maccabées", "4ma": "4 Maccabées", oda: "Odes",
  pss: "Psaumes de Salomon", ps151: "Psaume 151",
};

// Table des matières : quatre groupes protocanoniques par genre, puis le tier
// deutérocanonique et le tier surnuméraire, explicitement nommés.
export const LXX_GROUPS: EditorialGroup[] = [
  { title: "Pentateuque", ids: ["gen", "exo", "lev", "num", "deu"] },
  { title: "Livres historiques", ids: ["jos", "jdg", "rut", "1sa", "2sa", "1ki", "2ki", "1ch", "2ch", "esd", "neh", "est"] },
  { title: "Livres poétiques et sapientiaux", ids: ["job", "psa", "pro", "ecc", "sng"] },
  { title: "Livres prophétiques", ids: ["hos", "amo", "mic", "jol", "oba", "jon", "nam", "hab", "zep", "hag", "zec", "mal", "isa", "jer", "lam", "ezk", "dan"] },
  { title: "Deutérocanoniques (canon catholique)", ids: ["tob", "jdt", "1ma", "2ma", "wis", "sir", "bar", "lje", "sus", "bel"] },
  { title: "Surnuméraires (hors canon)", ids: ["1es", "3ma", "4ma", "oda", "pss", "ps151"] },
];

export const LXX_SUBGROUPS: SubGroup[] = [
  { id: "pent", title: "Pentateuque", short: "Pent.", color: "#4f86c6", books: ["gen", "exo", "lev", "num", "deu"] },
  { id: "hist", title: "Livres historiques", short: "Hist.", color: "#5bb5b0", books: ["jos", "jdg", "rut", "1sa", "2sa", "1ki", "2ki", "1ch", "2ch", "esd", "neh", "est"] },
  { id: "sap", title: "Poétiques et sapientiaux", short: "Sap.", color: "#e0823d", books: ["job", "psa", "pro", "ecc", "sng"] },
  { id: "proph", title: "Prophètes", short: "Proph.", color: "#8b5cf6", books: ["hos", "amo", "mic", "jol", "oba", "jon", "nam", "hab", "zep", "hag", "zec", "mal", "isa", "jer", "lam", "ezk", "dan"] },
  { id: "deut", title: "Deutérocanoniques", short: "Deut.", color: "#4cae7e", books: ["tob", "jdt", "1ma", "2ma", "wis", "sir", "bar", "lje", "sus", "bel"] },
  { id: "extra", title: "Surnuméraires", short: "Surn.", color: "#d8485a", books: ["1es", "3ma", "4ma", "oda", "pss", "ps151"] },
];
