// Table canonique des livres de la Septante (Rahlfs 1935). Sur ce site, le
// classement canonique EST le produit. Trois tiers explicites :
//   proto   - protocanoniques (canon hébreu, communs à tous)
//   deutero - deutérocanoniques (canon catholique)
//   extra   - surnuméraires (présents dans la LXX, hors canon catholique)
// Chaque livre source un code du dépôt eliranwong/LXX-Rahlfs-1935. Certains sont
// scindés par plage de chapitres (Esdras B', Psaume 151) et renumérotés. Les
// recensions non retenues (JoshA fragmentaire, JudgA, TobS, Dan/Bel/Sus ancien
// grec) sont volontairement exclues. Détails : docs/septante-canon.md.

export const BOOKS = [
  // --- Pentateuque (proto) ---
  { id: "gen", name: "Genèse", usfm: "GEN", canon: "proto", code: "Gen" },
  { id: "exo", name: "Exode", usfm: "EXO", canon: "proto", code: "Exod" },
  { id: "lev", name: "Lévitique", usfm: "LEV", canon: "proto", code: "Lev" },
  { id: "num", name: "Nombres", usfm: "NUM", canon: "proto", code: "Num" },
  { id: "deu", name: "Deutéronome", usfm: "DEU", canon: "proto", code: "Deut" },

  // --- Livres historiques (proto) ---
  { id: "jos", name: "Josué", usfm: "JOS", canon: "proto", code: "JoshB", note: "texte B (Vaticanus) ; recension A exclue" },
  { id: "jdg", name: "Juges", usfm: "JDG", canon: "proto", code: "JudgB", note: "texte B (Vaticanus) ; recension A exclue" },
  { id: "rut", name: "Ruth", usfm: "RUT", canon: "proto", code: "Ruth" },
  { id: "1sa", name: "1 Samuel", usfm: "1SA", canon: "proto", code: "1Sam/K", note: "1 Règnes (Α Βασιλειῶν) dans la LXX" },
  { id: "2sa", name: "2 Samuel", usfm: "2SA", canon: "proto", code: "2Sam/K", note: "2 Règnes (Β Βασιλειῶν) dans la LXX" },
  { id: "1ki", name: "1 Rois", usfm: "1KI", canon: "proto", code: "1/3Kgs", note: "3 Règnes (Γ Βασιλειῶν) dans la LXX" },
  { id: "2ki", name: "2 Rois", usfm: "2KI", canon: "proto", code: "2/4Kgs", note: "4 Règnes (Δ Βασιλειῶν) dans la LXX" },
  { id: "1ch", name: "1 Chroniques", usfm: "1CH", canon: "proto", code: "1Chr", note: "1 Paralipomènes dans la LXX" },
  { id: "2ch", name: "2 Chroniques", usfm: "2CH", canon: "proto", code: "2Chr", note: "2 Paralipomènes dans la LXX" },
  { id: "esd", name: "Esdras", usfm: "EZR", canon: "proto", code: "2Esdr", range: [1, 10], note: "Esdras B' de la LXX, ch. 1–10" },
  { id: "neh", name: "Néhémie", usfm: "NEH", canon: "proto", code: "2Esdr", range: [11, 23], renumber: -10, note: "Esdras B' de la LXX, ch. 11–23" },
  { id: "est", name: "Esther", usfm: "ESG", canon: "proto", code: "Esth", note: "Esther grec ; les sections supplémentaires sont deutérocanoniques" },

  // --- Livres poétiques et sapientiaux (proto) ---
  { id: "job", name: "Job", usfm: "JOB", canon: "proto", code: "Job" },
  { id: "psa", name: "Psaumes", usfm: "PSA", canon: "proto", code: "Ps", range: [1, 150] },
  { id: "pro", name: "Proverbes", usfm: "PRO", canon: "proto", code: "Prov" },
  { id: "ecc", name: "Ecclésiaste", usfm: "ECC", canon: "proto", code: "Qoh", note: "Qohéleth" },
  { id: "sng", name: "Cantique des cantiques", usfm: "SNG", canon: "proto", code: "Cant" },

  // --- Livres prophétiques (proto) - ordre LXX : les Douze, puis les grands ---
  { id: "hos", name: "Osée", usfm: "HOS", canon: "proto", code: "Hos" },
  { id: "amo", name: "Amos", usfm: "AMO", canon: "proto", code: "Amos" },
  { id: "mic", name: "Michée", usfm: "MIC", canon: "proto", code: "Mic" },
  { id: "jol", name: "Joël", usfm: "JOL", canon: "proto", code: "Joel" },
  { id: "oba", name: "Abdias", usfm: "OBA", canon: "proto", code: "Obad" },
  { id: "jon", name: "Jonas", usfm: "JON", canon: "proto", code: "Jonah" },
  { id: "nam", name: "Nahum", usfm: "NAM", canon: "proto", code: "Nah" },
  { id: "hab", name: "Habacuc", usfm: "HAB", canon: "proto", code: "Hab" },
  { id: "zep", name: "Sophonie", usfm: "ZEP", canon: "proto", code: "Zeph" },
  { id: "hag", name: "Aggée", usfm: "HAG", canon: "proto", code: "Hag" },
  { id: "zec", name: "Zacharie", usfm: "ZEC", canon: "proto", code: "Zech" },
  { id: "mal", name: "Malachie", usfm: "MAL", canon: "proto", code: "Mal" },
  { id: "isa", name: "Isaïe", usfm: "ISA", canon: "proto", code: "Isa" },
  { id: "jer", name: "Jérémie", usfm: "JER", canon: "proto", code: "Jer" },
  { id: "lam", name: "Lamentations", usfm: "LAM", canon: "proto", code: "Lam" },
  { id: "ezk", name: "Ézéchiel", usfm: "EZK", canon: "proto", code: "Ezek" },
  { id: "dan", name: "Daniel", usfm: "DAN", canon: "proto", code: "DanTh", note: "Daniel selon Théodotion ; version ancienne (OG) exclue" },

  // --- Deutérocanoniques (canon catholique) ---
  { id: "tob", name: "Tobie", usfm: "TOB", canon: "deutero", code: "TobBA", note: "texte court (BA) ; recension longue (Sinaiticus) exclue" },
  { id: "jdt", name: "Judith", usfm: "JDT", canon: "deutero", code: "Jdt" },
  { id: "1ma", name: "1 Maccabées", usfm: "1MA", canon: "deutero", code: "1Mac" },
  { id: "2ma", name: "2 Maccabées", usfm: "2MA", canon: "deutero", code: "2Mac" },
  { id: "wis", name: "Sagesse", usfm: "WIS", canon: "deutero", code: "Wis", note: "Sagesse de Salomon" },
  { id: "sir", name: "Siracide", usfm: "SIR", canon: "deutero", code: "Sir", note: "Ecclésiastique ; prologue grec inclus (ch. 0)" },
  { id: "bar", name: "Baruch", usfm: "BAR", canon: "deutero", code: "Bar" },
  { id: "lje", name: "Lettre de Jérémie", usfm: "LJE", canon: "deutero", code: "EpJer", note: "= Baruch 6 dans la Vulgate" },
  { id: "sus", name: "Suzanne", usfm: "SUS", canon: "deutero", code: "SusTh", note: "addition grecque à Daniel (Théodotion) ; = Daniel 13 dans la Vulgate" },
  { id: "bel", name: "Bel et le Dragon", usfm: "BEL", canon: "deutero", code: "BelTh", note: "addition grecque à Daniel (Théodotion) ; = Daniel 14 dans la Vulgate" },

  // --- Surnuméraires (hors canon catholique) ---
  { id: "1es", name: "Esdras A'", usfm: "1ES", canon: "extra", code: "1Esdr", note: "1 Esdras grec ; = 3 Esdras de la Vulgate ; non reçu comme Écriture" },
  { id: "3ma", name: "3 Maccabées", usfm: "3MA", canon: "extra", code: "3Mac" },
  { id: "4ma", name: "4 Maccabées", usfm: "4MA", canon: "extra", code: "4Mac" },
  { id: "oda", name: "Odes", usfm: "ODA", canon: "extra", code: "Od", note: "cantiques liturgiques, dont la Prière de Manassé" },
  { id: "pss", name: "Psaumes de Salomon", usfm: "PSS", canon: "extra", code: "PsSol" },
  { id: "ps151", name: "Psaume 151", usfm: "PS2", canon: "extra", code: "Ps", range: [151, 151], renumber: -150, note: "psaume surnuméraire, hors des 150" },
];

// Résout (code dépôt, chapitre source) -> { book, chapter } de sortie, en
// tenant compte des plages et renumérotations. null si le code n'est pas retenu
// (recension exclue) -> le mot sera ignoré et compté dans le log.
export function resolveBook(code, chapter) {
  for (const b of BOOKS) {
    if (b.code !== code) continue;
    if (b.range && (chapter < b.range[0] || chapter > b.range[1])) continue;
    return { book: b, chapter: chapter + (b.renumber ?? 0) };
  }
  return null;
}
