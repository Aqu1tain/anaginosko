// Traduction française de la Septante : Pierre Giguet 1872 (domaine public),
// transcrite sur fr.wikisource (CC BY-SA). Écrit public/lxx/<id>/fr.json =
// { chapitre: { verset: texte } }, comme le NT. Giguet traduit la LXX elle-même,
// donc sa versification suit le grec (Rahlfs). Les livres surnuméraires (3-4
// Maccabées, Odes, Psaumes de Salomon, Ps 151, Esdras A') ne sont pas chez Giguet
// -> ils restent gréco-seuls (le lecteur tolère fr.json absent).
// Run: node scripts/fetch-lxx-french.mjs [id...]   (sans argument = tous)
import { writeFileSync, mkdirSync, existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(root, "public/lxx");
const API = "https://fr.wikisource.org/w/api.php";
const BASE = "Traduction de la Septante et du Nouveau Testament/";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Page wikisource -> id de notre corpus. Daniel inclut Suzanne (ch.13) et Bel
// (ch.14) chez Giguet : traités à part (split:true) vers sus/bel.
const BOOKS = [
  ["Genèse", "gen"], ["Exode", "exo"], ["Lévitique", "lev"], ["Nombres", "num"], ["Deutéronome", "deu"],
  ["Josué", "jos"], ["Juges", "jdg"], ["Ruth", "rut"], ["I Samuel", "1sa"], ["II Samuel", "2sa"],
  ["I Rois", "1ki"], ["II Rois", "2ki"], ["I Chroniques", "1ch"], ["II Chroniques", "2ch"],
  ["Esdras", "esd"], ["Néhémie", "neh"], ["Esther", "est"],
  ["Job", "job"], ["Psaumes", "psa"], ["Proverbes", "pro"], ["Ecclésiaste", "ecc"], ["Cantique", "sng"],
  ["Osée", "hos"], ["Amos", "amo"], ["Michée", "mic"], ["Joel", "jol"], ["Abdias", "oba"], ["Jonas", "jon"],
  ["Nahum", "nam"], ["Habacuc", "hab"], ["Sophonie", "zep"], ["Aggée", "hag"], ["Zacharie", "zec"], ["Malachie", "mal"],
  ["Isaïe", "isa"], ["Jérémie", "jer"], ["Lamentations", "lam"], ["Ezéchiel", "ezk"], ["Daniel", "dan"],
  ["Tobit", "tob"], ["Judith", "jdt"], ["I Machabées", "1ma"], ["II Machabées", "2ma"],
  ["Sagesse", "wis"], ["Ecclésiastique", "sir"], ["Baruch", "bar"], ["Lettre de Jérémie", "lje"],
];

const ROMAN = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
function romanToInt(s) {
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const cur = ROMAN[s[i]];
    const next = ROMAN[s[i + 1]] ?? 0;
    n += cur < next ? -cur : cur;
  }
  return n;
}

async function fetchText(page) {
  const url = `${API}?action=parse&page=${encodeURIComponent(page)}&format=json&prop=text&disablelimitreport=1&disabletoc=1`;
  const r = await fetch(url, { headers: { "User-Agent": "anaginosko-french-import/1.0 (corentinfox08@gmail.com)" } });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${page}`);
  const j = await r.json();
  let h = j?.parse?.text?.["*"];
  if (!h) throw new Error(`pas de texte : ${page}`);
  h = h.replace(/<span[^>]*class="[^"]*pagenum[^"]*"[^>]*>[\s\S]*?<\/span>/g, " "); // n° de page djvu
  h = h.replace(/<sup[^>]*class="[^"]*reference[^"]*"[^>]*>[\s\S]*?<\/sup>/g, " "); // appels de note
  let t = h.replace(/<[^>]+>/g, " ");
  t = t
    .replace(/&#x?[0-9a-fA-F]+;/g, (e) => {
      const m = e.match(/&#(x?)([0-9a-fA-F]+);/);
      return String.fromCodePoint(parseInt(m[2], m[1] ? 16 : 10));
    })
    .replace(/&nbsp;/g, " ")
    .replace(/&rsquo;/g, "’")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');
  return t.replace(/\s+/g, " ").trim();
}

// Chapitres : « CHAPITRE <roman> » (ou « PSAUME <roman> » pour les Psaumes).
function parseChapters(text) {
  const re = /(?:CHAPITRE|PSAUME)\s+([IVXLCDM]+)\b/g;
  const marks = [];
  let m;
  while ((m = re.exec(text))) marks.push({ ch: romanToInt(m[1]), start: m.index, end: re.lastIndex });
  const chapters = new Map();
  for (let i = 0; i < marks.length; i++) {
    const body = text.slice(marks[i].end, i + 1 < marks.length ? marks[i + 1].start : undefined);
    chapters.set(marks[i].ch, body);
  }
  return chapters;
}

// Versets : marqueurs « N. » monotones (tolère petits trous, rejette les nombres
// du texte par le saut max).
function parseVerses(chapterText) {
  const re = /(?:^|[^0-9])(\d+)\.\s/g;
  const marks = [];
  let m;
  let last = 0;
  while ((m = re.exec(chapterText))) {
    const n = Number(m[1]);
    if (n > last && n <= last + 6) {
      marks.push({ n, textStart: re.lastIndex, idx: m.index });
      last = n;
      re.lastIndex = marks[marks.length - 1].textStart;
    }
  }
  const verses = {};
  for (let i = 0; i < marks.length; i++) {
    const txt = chapterText.slice(marks[i].textStart, i + 1 < marks.length ? marks[i + 1].idx : undefined).trim();
    if (txt) verses[marks[i].n] = txt;
  }
  return verses;
}

// Clés-versets grecques d'un chapitre déjà bâti (pour le diff de cohérence).
function greekVerseKeys(id, ch) {
  const f = resolve(outDir, id, `${ch}.json`);
  if (!existsSync(f)) return null;
  const mots = JSON.parse(readFileSync(f, "utf8")).mots;
  return new Set(mots.map((w) => w.verse).filter((v) => v != null));
}

function writeFrench(id, chapters) {
  const dir = resolve(outDir, id);
  if (!existsSync(dir)) {
    console.warn(`  ! ${id} : dossier absent (livre non bâti côté grec), ignoré`);
    return;
  }
  const fr = {};
  for (const [ch, verses] of chapters) fr[ch] = verses;
  writeFileSync(resolve(dir, "fr.json"), JSON.stringify(fr));
  // Diff de cohérence : versets français vs grecs, chapitre par chapitre.
  let warn = 0;
  for (const [ch, verses] of chapters) {
    const gk = greekVerseKeys(id, ch);
    if (!gk) continue;
    const fk = new Set(Object.keys(verses).map(Number));
    const missing = [...gk].filter((v) => !fk.has(v)).length;
    if (missing > 2) {
      warn++;
      if (warn <= 3) console.warn(`    ~ ${id} ${ch} : ${missing} versets grecs sans français`);
    }
  }
  const chs = [...chapters.keys()];
  const vtot = [...chapters.values()].reduce((a, v) => a + Object.keys(v).length, 0);
  console.log(`  ${id} : ${chs.length} ch, ${vtot} versets${warn ? ` (${warn} ch divergents)` : ""}`);
}

const only = new Set(process.argv.slice(2));
const todo = only.size ? BOOKS.filter(([, id]) => only.has(id)) : BOOKS;

for (const [page, id] of todo) {
  try {
    const text = await fetchText(BASE + page);
    let chapters = parseChapters(text);
    if (chapters.size === 0) chapters = new Map([[1, text]]); // livre mono-chapitre
    const parsed = new Map();
    for (const [ch, body] of chapters) parsed.set(ch, parseVerses(body));

    if (id === "dan") {
      // Giguet inclut Suzanne (13) et Bel (14) dans Daniel -> livres séparés.
      for (const [ch, target] of [[13, "sus"], [14, "bel"]]) {
        if (parsed.has(ch)) writeFrench(target, new Map([[1, parsed.get(ch)]]));
      }
      const danOnly = new Map([...parsed].filter(([ch]) => ch <= 12));
      writeFrench("dan", danOnly);
    } else {
      writeFrench(id, parsed);
    }
  } catch (e) {
    console.warn(`  ! ${id} (${page}) : ${e.message}`);
  }
  await sleep(300);
}

console.log("\nTerminé.");
