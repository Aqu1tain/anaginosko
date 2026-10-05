import { readFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";

// Références AELF (cache de fetch-aelf.mjs) résolues dans la numérotation du
// corpus du site. Seules les références sont gardées, jamais les textes.

export const root = path.resolve(new URL("../../..", import.meta.url).pathname);

const ABBR = {
  Gn: "gen", Ex: "exo", Lv: "lev", Nb: "num", Dt: "deu", Jos: "jos", Jg: "jdg", Rt: "rut",
  "1 S": "1sa", "2 S": "2sa", "1 R": "1ki", "2 R": "2ki", "1 Ch": "1ch", "2 Ch": "2ch",
  Esd: "esd", Ne: "neh", Tb: "tob", Jdt: "jdt", Est: "est", "1 M": "1ma", "2 M": "2ma",
  Jb: "job", Ps: "psa", Pr: "pro", Qo: "ecc", Ct: "sng", Sg: "wis", Si: "sir",
  Is: "isa", "Isaïe": "isa", Matthieu: "mt", Marc: "mk", Luc: "lk", Jean: "jn", Jr: "jer", Lm: "lam", Ba: "bar", Ez: "ezk", Dn: "dan",
  Os: "hos", Jl: "jol", Am: "amo", Ab: "oba", Jon: "jon", Mi: "mic", Na: "nam", Ha: "hab",
  So: "zep", Ag: "hag", Za: "zec", Ml: "mal",
  Mt: "mt", Mc: "mk", Lc: "lk", Jn: "jn", Ac: "ac", Rm: "ro", "1 Co": "1co", "2 Co": "2co",
  Ga: "ga", Ep: "eph", Ph: "php", Col: "col", "1 Th": "1th", "2 Th": "2th", "1 Tm": "1ti",
  "2 Tm": "2ti", Tt: "tit", Phm: "phm", He: "heb", Jc: "jas", "1 P": "1pe", "2 P": "2pe",
  "1 Jn": "1jn", "2 Jn": "2jn", "3 Jn": "3jn", Jude: "jud", Ap: "re",
};
const SINGLE_CHAPTER = new Set(["phm", "jud", "2jn", "3jn", "oba"]);

const readBooks = (corpus) =>
  JSON.parse(readFileSync(path.join(root, "public", corpus, "books.json"), "utf8")).books;
const NT_BOOKS = new Set(readBooks("nt").map((b) => b.id));
const NAMES = Object.fromEntries([...readBooks("nt"), ...readBooks("lxx")].map((b) => [b.id, b.name]));
NAMES.psa = "Psaume";
NAMES.ac = "Actes des Apôtres";

export const LABELS = {
  lecture_1: ["lecture", "Première lecture"],
  lecture_2: ["lecture", "Deuxième lecture"],
  lecture_3: ["lecture", "Troisième lecture"],
  lecture_4: ["lecture", "Quatrième lecture"],
  lecture_5: ["lecture", "Cinquième lecture"],
  lecture_6: ["lecture", "Sixième lecture"],
  lecture_7: ["lecture", "Septième lecture"],
  psaume: ["psaume", "Psaume"],
  cantique: ["cantique", "Cantique"],
  epitre: ["epitre", "Épître"],
  evangile: ["evangile", "Évangile"],
  entree_messianique: ["evangile", "Évangile de l'entrée messianique"],
};
export const COLORS = new Set(["vert", "violet", "blanc", "rouge", "rose", "noir", "or"]);

// Jérémie : l'ordre grec (Rahlfs) diffère de l'hébreu à partir du chapitre 25.
const JEREMIAH = { 26: 33, 27: 34, 28: 35, 29: 36, 30: 37, 31: 38, 32: 39, 33: 40, 34: 41, 35: 42, 36: 43, 37: 44, 38: 45, 39: 46, 40: 47, 41: 48, 42: 49, 43: 50, 44: 51, 46: 26, 50: 27, 51: 28, 48: 31 };

const verseCache = new Map();
function versesOf(corpus, book, chapter) {
  const key = `${corpus}/${book}/${chapter}`;
  if (!verseCache.has(key)) {
    const file = path.join(root, "public", corpus, book, `${chapter}.json`);
    const verses = existsSync(file) ? [...new Set(JSON.parse(readFileSync(file, "utf8")).mots.map((m) => m.verse))] : [];
    verseCache.set(key, verses.filter((v) => v != null).sort((a, b) => a - b));
  }
  return verseCache.get(key);
}

const normalize = (s) =>
  s
    .replace(/[  ]/g, " ")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\((?!\d+\s*[abAB]?\))[^)]*\)/g, "")
    .replace(/^[^.\d]*\.\s+(?=(?:[123]\s?)?[A-Z])/, "")
    .replace(/,\s*-/g, "-")
    .replace(/\s+/g, " ")
    .trim();

function parseItems(spec) {
  return spec
    .split(/[.,]/)
    .map((item) => item.trim().replace(/^-/, ""))
    .map((item) => item.match(/^(\d+)[a-z]*(?:\s*-\s*(\d+)[a-z]*)?$/i))
    .filter(Boolean)
    .map((m) => ({ from: Number(m[1]), to: Number(m[2] ?? m[1]) }));
}

// « 3, 9-15.32 – 4, 4 » : la borne avant le tiret long court jusqu'à la fin du
// chapitre, celle d'après part du verset 1 du chapitre suivant.
function parseGroup(group, singleChapter) {
  const m = group.match(/^(\d+)(?:\s*,\s*|\s+)(.*)$/);
  const [chapter, spec] = m && !singleChapter ? [Number(m[1]), m[2]] : [1, group];
  const parts = spec.split(/\s*[–—]\s*/);
  const segments = [];
  parts.forEach((part, idx) => {
    const pm = idx === 0 ? null : part.match(/^(\d+)\s*,\s*(.*)$/);
    const c = pm ? Number(pm[1]) : chapter;
    const items = parseItems(pm ? pm[2] : part).map((s) => ({ chapter: c, ...s }));
    if (idx > 0 && items[0]) items[0].from = 1;
    if (idx < parts.length - 1 && items.length) items[items.length - 1].to = Infinity;
    segments.push(...items);
  });
  return segments;
}

function psalmOffset(lxx, hebrew, verse) {
  if (lxx === 9 && hebrew === 10) return verse + 21;
  if (lxx === 113 && hebrew === 115) return verse + 8;
  if (lxx === 115 && verse >= 10) return verse - 9;
  if (lxx === 147 && verse >= 12) return verse - 11;
  return verse;
}

function parseRef(raw, type) {
  let ref = normalize(raw).replace(/^Cantique\s+/i, "");
  if (type === "psaume" && /^\d/.test(ref)) ref = `Ps ${ref}`;
  const m = ref.match(/^((?:[123]\s?)?[A-Za-zÀ-ÿ]+)\s*(.*)$/);
  if (!m) return null;
  const abbr = m[1].replace(/^([123])\s?/, "$1 ");
  const book = ABBR[abbr];
  if (!book) return null;
  const rest = m[2];
  if (book === "psa") {
    const segments = [];
    let current = null;
    for (const group of rest.split(/\s*;\s*/)) {
      const pm = group.match(/^(\d+)\s*[ABab]?\s*(?:\((\d+)\s*[abAB]?\))?\s*,\s*(.*)$/) ?? group.match(/^(\d+)\s*[ABab]?\s*(?:\((\d+)\s*[abAB]?\))?()$/);
      if (pm) current = { lxx: Number(pm[1]), hebrew: pm[2] ? Number(pm[2]) : Number(pm[1]) };
      if (!current) return null;
      const { lxx, hebrew } = current;
      for (const s of parseItems(pm ? pm[3] : group)) {
        segments.push({ chapter: lxx, from: psalmOffset(lxx, hebrew, s.from), to: psalmOffset(lxx, hebrew, s.to) });
      }
    }
    return { book, display: `${NAMES.psa} ${rest}`, segments };
  }
  const segments = rest.split(/\s*;\s*/).flatMap((g) => parseGroup(g, SINGLE_CHAPTER.has(book)));
  return { book, display: `${NAMES[book]} ${rest}`, segments };
}

function toSite(book, { chapter, from, to }) {
  if (book === "jer" && JEREMIAH[chapter]) return { book, chapter: JEREMIAH[chapter], from, to };
  if (book === "1ki" && (chapter === 20 || chapter === 21)) return { book, chapter: 41 - chapter, from, to };
  if (book === "dan" && chapter === 13) return { book: "sus", chapter: 1, from, to };
  if (book === "dan" && chapter === 14) return { book: "bel", chapter: 1, from, to };
  if (book === "bar" && chapter === 6) return { book: "lje", chapter: 1, from, to };
  return { book, chapter, from, to };
}

function clamp(corpus, seg) {
  const verses = versesOf(corpus, seg.book, seg.chapter).filter((v) => v >= seg.from && v <= seg.to);
  if (!verses.length) return null;
  return { corpus, book: seg.book, chapter: seg.chapter, from: verses[0], to: verses[verses.length - 1] };
}

function merge(passages) {
  const out = [];
  for (const p of passages) {
    const last = out[out.length - 1];
    if (last && last.book === p.book && last.chapter === p.chapter && p.from <= last.to + 1 && p.to >= last.from) {
      last.from = Math.min(last.from, p.from);
      last.to = Math.max(last.to, p.to);
      continue;
    }
    out.push({ ...p });
  }
  return out;
}

export const unresolved = [];

function reading(lecture, idx, list) {
  const label = LABELS[lecture.type];
  if (!label || !lecture.ref) return null;
  const parsed = parseRef(lecture.ref, lecture.type);
  if (!parsed?.segments.length) {
    unresolved.push(lecture.ref);
    return null;
  }
  const corpus = NT_BOOKS.has(parsed.book) ? "nt" : "lxx";
  const sited = parsed.segments.map((s) => toSite(parsed.book, s));
  const found = merge(sited.map((s) => clamp(corpus, s)).filter(Boolean));
  const passages = found.length
    ? found
    : [{ corpus, book: sited[0].book, chapter: sited[0].chapter, from: sited[0].from, to: Number.isFinite(sited[0].to) ? sited[0].to : sited[0].from, absent: true }];
  const out = { kind: label[0], label: label[1], ref: parsed.display, passages };
  if (idx > 0 && list[idx - 1].type === lecture.type) out.alternative = true;
  return out;
}

const saints = (s) =>
  s
    .replace(/\bSs\.\s*/g, "saints ")
    .replace(/\bS\.\s*/g, "saint ")
    .replace(/\bSte\s+/g, "sainte ")
    .replace(/\b[Ss]t\s+/g, "saint ")
    .replace(/\bEglise\b/g, "Église");

const unshout = (s) =>
  s
    .replace(/[A-ZÀ-ÖØ-Þ]{2,}|\b[A-Z](?=['’][A-ZÀ-ÖØ-Þ]{2,})/g, (w) => (w.length > 1 && /^[IVXL]+$/.test(w) ? w : w.toLowerCase()))
    .replace(/\bseigneur\b/g, "Seigneur")
    .replace(/\bpâques\b/g, "Pâques")
    .replace(/\bcène\b/g, "Cène")
    .replace(/\bveillee\b/g, "veillée");

export const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const uncapitalize = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);

const clean = (s) =>
  saints(
    (s ?? "")
      .replace(/\[[^\]]*\]/g, "")
      .replace(/\([^)]*\)/g, "")
      .replace(/-?\s*Psautier.*$/i, "")
      .replace(/(\d+)ème/g, "$1e")
      .replace(/(\d+)ère/g, "$1re")
      .replace(/\bSemaine\b/g, "semaine")
      .replace(/\bTemps Ordinaire\b/g, "temps ordinaire")
      .replace(/\bdu Temps\b/g, "du temps")
      .replace(/\btemps Pascal\b/g, "temps pascal")
      .replace(/\s+/g, " ")
      .replace(/\s+,/g, ",")
      .trim(),
  );

const DEGREES = /^(solennité|fête|mémoire|férie|de la férie)/i;

function titles(info) {
  const l1 = clean(info.ligne1);
  const title = capitalize(unshout(/^\d+(er)? \p{L}+$/u.test(l1) && info.degre ? info.degre : l1));
  const l2 = clean(info.ligne2);
  const l3 = clean(info.ligne3);
  const parts = [];
  if (l2 && !/^de la férie$/i.test(l2)) parts.push(l2);
  if (l3 && DEGREES.test(l3)) parts.push(parts.length ? uncapitalize(l3) : l3);
  return { title, detail: capitalize(parts.join(", ")) || undefined };
}

const massName = (name) => capitalize(unshout(saints(name.trim())));

export function buildDay(raw) {
  const { title, detail } = titles(raw.informations);
  const masses = raw.messes
    .map((m) => ({ name: massName(m.nom), readings: m.lectures.filter((l) => LABELS[l.type]).map(reading).filter(Boolean) }))
    .filter((m) => m.readings.length);
  const notes = raw.messes.filter((m) => !m.lectures.length).map((m) => saints(m.nom.trim()).replace(/\.?$/, "."));
  const day = { title };
  if (detail) day.detail = detail;
  if (COLORS.has(raw.informations.couleur)) day.color = raw.informations.couleur;
  if (!masses.length && notes.length) day.note = notes.join(" ");
  day.masses = masses.length > 1 ? masses : masses.map(({ readings }) => ({ readings }));
  return day;
}

export function readCache(dir) {
  const files = readdirSync(dir).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
  return new Map(files.map((f) => [f.slice(0, 10), buildDay(JSON.parse(readFileSync(path.join(dir, f), "utf8")))]));
}

export function readComplements() {
  const { days } = JSON.parse(readFileSync(new URL("./complements.json", import.meta.url), "utf8"));
  return new Map(Object.entries(days).map(([iso, raw]) => [iso, buildDay(raw)]));
}
