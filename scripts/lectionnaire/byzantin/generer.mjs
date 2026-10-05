import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const here = path.dirname(new URL(import.meta.url).pathname);
const root = path.resolve(here, "../../..");
const outDir = path.join(root, "data/lectionnaire/byzantin");
const table = (name) => JSON.parse(readFileSync(path.join(here, "tables", name), "utf8"));
const CYCLE = table("cycle.json");
const MENEE = table("menee.json");
const FLOTTANTES = table("flottantes.json");
const SOURCE = "orthocal-python (Brian Glass, MIT), usage grec, Pâques grégorienne";

const mod = (a, n) => ((a % n) + n) % n;
const weekday = (pdist) => mod(pdist, 7);
const JOURS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

export function gregorianJdn(y, m, d) {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}

function julianJdn(y, m, d) {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - 32083;
}

export function jdnToDate(j) {
  const a = j + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  return { y: 100 * b + d - 4800 + Math.floor(m / 10), m: m + 3 - 12 * Math.floor(m / 10), d: e - Math.floor((153 * m + 2) / 5) + 1 };
}

export function paquesGregoriennes(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100;
  const h = (19 * a + b - Math.floor(b / 4) - Math.floor((b - Math.floor((b + 8) / 25) + 1) / 3) + 15) % 30;
  const l = (32 + 2 * (b % 4) + 2 * Math.floor(c / 4) - h - (c % 4)) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const n = h + l - 7 * m + 114;
  return gregorianJdn(y, Math.floor(n / 31), (n % 31) + 1);
}

export function paquesJuliennes(y) {
  const d = (19 * (y % 19) + 15) % 30;
  const e = (2 * (y % 4) + 4 * (y % 7) - d + 34) % 7;
  const n = d + e + 114;
  return julianJdn(y, Math.floor(n / 31), (n % 31) + 1);
}

function weekends(p) {
  const w = weekday(p);
  return { satBefore: p - w - 1, sunBefore: p - 7 + mod(7 - w, 7), satAfter: p + 7 - mod(w + 1, 7), sunAfter: p + 7 - w };
}

const LUKAN_WINDOWS = [[10, 11, 10, 17, 4], [10, 30, 11, 5, 5], [11, 24, 11, 30, 13], [12, 1, 12, 3, 14], [12, 4, 12, 10, 10], [12, 11, 12, 17, 11]];
const LUKAN_OVERRIDES = [[10, 18], [11, 16], [11, 30]];
const INTERPOLATION_PRIORITY = [["luc", 12], ["luc", 15], ["luc", 14], ["matthieu", 16], ["matthieu", 15]];
const lukanTarget = (n) => 168 + 7 * n;
const matthewTarget = (n) => 49 + 7 * n;
const years = new Map();

export function annee(y, comput) {
  const key = `${comput.name}:${y}`;
  if (!years.has(key)) years.set(key, buildYear(y, comput));
  return years.get(key);
}

function buildYear(y, comput) {
  const pascha = comput(y);
  const next = comput(y + 1);
  const at = (m, d, yy = y) => gregorianJdn(yy, m, d) - pascha;
  const elevation = at(9, 14), theophany = at(1, 6, y + 1), nativity = at(12, 25), annunciation = at(3, 25);
  const E = weekends(elevation), T = weekends(theophany), N = weekends(nativity);
  const forefathers = nativity - 14 + mod(7 - weekday(nativity), 7);
  const year = { y, comput, pascha, next, previous: comput(y - 1), theophany, nativity, forefathers, E, T, N };
  year.lukanJump = 169 - (E.sunAfter + 1);
  year.firstSunLuke = E.sunAfter + 7;
  year.noDaily = noDaily(year, annunciation);
  year.floats = floats(year, at, elevation);
  year.lukanNumbers = lukanNumbers(year, at);
  const triodion = next - pascha - 70;
  year.greekExtra = Math.floor((triodion - T.sunAfter) / 7);
  year.regularExtra = year.greekExtra - (weekday(theophany + 8) === 0 ? 1 : 0);
  year.interpolation = interpolation(year);
  return year;
}

function noDaily({ T, N, theophany, nativity, forefathers }, annunciation) {
  const set = new Set([T.sunBefore, T.sunAfter, theophany - 5, theophany - 1, theophany, forefathers, N.sunBefore, nativity - 1, nativity, nativity + 1, N.sunAfter]);
  if (T.satAfter === theophany + 1) set.add(T.satAfter);
  if (weekday(annunciation) === 6) set.add(annunciation);
  return set;
}

function floats({ E, T, N, theophany, nativity, forefathers }, at, elevation) {
  const f = new Map();
  const put = (p, index) => f.set(p, index);
  const jul16 = at(7, 16), oct11 = at(10, 11);
  put(weekday(jul16) < 4 ? jul16 - weekday(jul16) : jul16 + 7 - weekday(jul16), 1001);
  put(weekday(oct11) > 0 ? oct11 + 7 - weekday(oct11) : oct11, 1002);
  put(E.sunBefore, 1007);
  put(E.satAfter, 1008);
  put(E.sunAfter, 1009);
  put(forefathers, 1010);
  put(T.satAfter, 1029);
  put(T.sunAfter, 1030);
  if (![6, 0].includes(weekday(theophany + 8))) put(theophany + 8, 1038);
  if (E.satBefore === at(9, 8)) put(elevation - 1, 1005);
  else put(E.satBefore, 1006);
  nativityFloats(put, N, T, theophany, nativity);
  return f;
}

function nativityFloats(put, N, T, theophany, nativity) {
  const eve = nativity - 1;
  if (eve === N.satBefore) [[nativity - 2, 1013], [N.sunBefore, 1012], [eve, 1015]].forEach(([p, i]) => put(p, i));
  else if (eve === N.sunBefore) [[nativity - 3, 1013], [N.satBefore, 1011], [eve, 1016]].forEach(([p, i]) => put(p, i));
  else [[eve, 1014], [N.satBefore, 1011], [N.sunBefore, 1012]].forEach(([p, i]) => put(p, i));
  const byWeekday = {
    0: [[N.satAfter, 1017], [nativity + 1, 1020], [T.sunBefore, 1024], [theophany - 1, 1026]],
    1: [[N.satAfter, 1017], [N.sunAfter, 1021], [theophany - 5, 1023], [theophany - 1, 1026]],
    2: [[N.satAfter, 1019], [N.sunAfter, 1021], [T.satBefore, 1027], [theophany - 5, 1023], [theophany - 2, 1025]],
    3: [[N.satAfter, 1019], [N.sunAfter, 1021], [T.satBefore, 1022], [T.sunBefore, 1028], [theophany - 3, 1025]],
    4: [[N.satAfter, 1019], [N.sunAfter, 1021], [T.satBefore, 1022], [T.sunBefore, 1024], [theophany - 1, 1026]],
    5: [[N.satAfter, 1019], [N.sunAfter, 1021], [T.satBefore, 1022], [T.sunBefore, 1024], [theophany - 1, 1026]],
    6: [[nativity + 6, 1018], [N.sunAfter, 1021], [T.satBefore, 1022], [T.sunBefore, 1024], [theophany - 1, 1026]],
  };
  byWeekday[weekday(nativity)].forEach(([p, i]) => put(p, i));
}

function lukanNumbers({ firstSunLuke, forefathers }, at) {
  const windows = LUKAN_WINDOWS.map(([m1, d1, m2, d2, n]) => [at(m1, d1), at(m2, d2), n]);
  const reserved = new Set(windows.map(([, , n]) => n));
  const overrides = new Set(LUKAN_OVERRIDES.map(([m, d]) => at(m, d)));
  const result = new Map();
  let next = 1;
  for (let p = firstSunLuke; p <= forefathers; p += 7) {
    let assigned = windows.find(([start, end]) => start <= p && p <= end)?.[2];
    if (assigned === undefined) {
      while (reserved.has(next)) next++;
      assigned = next++;
    }
    if (!overrides.has(p)) result.set(p, assigned);
  }
  return result;
}

function interpolation(year) {
  const used = new Set(year.lukanNumbers.values());
  const pool = INTERPOLATION_PRIORITY.filter(([book, n]) => book === "matthieu" || !used.has(n));
  const chosen = pool.slice(0, Math.max(year.regularExtra - 2, 0));
  chosen.sort((a, b) => (a[0] === "matthieu") - (b[0] === "matthieu") || a[1] - b[1]);
  const leading = year.regularExtra !== year.greekExtra ? [["direct", 1030]] : [];
  const result = new Map();
  [...leading, ...chosen].forEach((entry, i) => result.set(year.T.sunAfter + 7 * (i + 1), entry));
  return result;
}

const canaanite = (year) => annee(year.y - 1, year.comput).regularExtra >= 4;

function sundayGospelOverride(year, p) {
  if (p === -77 && canaanite(year)) return { pdist: matthewTarget(17), label: "Dimanche de la Cananéenne" };
  if (year.firstSunLuke <= p && p <= year.forefathers) {
    const n = year.lukanNumbers.get(p);
    return n === undefined ? false : { pdist: lukanTarget(n), label: `${ordinal(n)} dimanche de Luc`, epistle: null };
  }
  const entry = year.interpolation.get(p);
  if (!entry) return null;
  const [book, n] = entry;
  if (book === "direct") return { pdist: n };
  if (book === "matthieu") return { pdist: matthewTarget(n), label: `${ordinal(n)} dimanche de Matthieu` };
  return { pdist: lukanTarget(n), label: `${ordinal(n)} dimanche de Luc` };
}

function pyearOf(j, comput) {
  const { y } = jdnToDate(j);
  const current = annee(y, comput);
  return j - current.pascha < -77 ? annee(y - 1, comput) : current;
}

function aroundYears(j, comput) {
  const { y } = jdnToDate(j);
  return [annee(y - 1, comput), annee(y, comput)];
}

export function cycleOf(j, comput, { ownFrame = false } = {}) {
  const year = pyearOf(j, comput);
  const pd = j - year.pascha;
  const wd = weekday(pd);
  const frames = ownFrame ? [year] : aroundYears(j, comput);
  const hasDaily = !frames.some((f) => f.noDaily.has(j - f.pascha));
  const floatIndex = year.floats.get(pd) ?? frames.map((f) => f.floats.get(j - f.pascha)).find(Boolean) ?? null;
  const override = wd === 0 ? sundayGospelOverride(year, pd) : null;
  return { j, year, pd, wd, hasDaily, floatIndex, override, ...readingPdists(year, j, pd, hasDaily, override) };
}

function readingPdists(year, j, pd, hasDaily, override) {
  if (!hasDaily || override === false) return { epistle: null, gospel: null };
  if (override) return { epistle: override.epistle === null ? epistlePdist(year, j, pd) : override.pdist, gospel: override.pdist };
  return { epistle: epistlePdist(year, j, pd), gospel: gospelPdist(year, j, pd) };
}

function epistlePdist(year, j, pd) {
  if (pd === 49 + 29 * 7) return year.forefathers;
  if (pd >= 49 + 32 * 7) return j - year.next;
  return pd;
}

function gospelPdist(year, j, pd) {
  if (pd === year.firstSunLuke + 70) return year.forefathers + year.lukanJump;
  if (pd > year.T.satBefore) return j - year.next;
  if (pd > year.E.sunAfter) return pd + year.lukanJump;
  if (year.lukanJump < 0 && pd >= 169) return pd + year.lukanJump;
  return pd;
}

function ordinal(n, feminine = false) {
  if (n === 1) return feminine ? "1re" : "1er";
  return `${n}e`;
}

const PROPRES = {
  "-70": "Dimanche du Publicain et du Pharisien",
  "-63": "Dimanche du Fils prodigue",
  "-57": "Samedi des défunts",
  "-56": "Dimanche du Jugement dernier",
  "-50": "Samedi des saints ascètes",
  "-49": "Dimanche de la Tyrophagie, du Pardon",
  "-42": "1er dimanche du Grand Carême, de l'Orthodoxie",
  "-35": "2e dimanche du Grand Carême",
  "-28": "3e dimanche du Grand Carême, de la Croix",
  "-21": "4e dimanche du Grand Carême, de saint Jean Climaque",
  "-15": "Samedi de l'Acathiste",
  "-14": "5e dimanche du Grand Carême, de sainte Marie l'Égyptienne",
  "-8": "Samedi de Lazare",
  "-7": "Dimanche des Rameaux",
  "-6": "Lundi saint",
  "-5": "Mardi saint",
  "-4": "Mercredi saint",
  "-3": "Jeudi saint",
  "-2": "Vendredi saint",
  "-1": "Samedi saint",
  0: "Dimanche de Pâques",
  7: "Dimanche de Thomas",
  14: "Dimanche des Myrophores",
  21: "Dimanche du Paralytique",
  24: "Mercredi de la Mi-Pentecôte",
  28: "Dimanche de la Samaritaine",
  35: "Dimanche de l'Aveugle-né",
  38: "Clôture de Pâques",
  39: "Ascension du Seigneur",
  42: "Dimanche des saints Pères du Ier concile de Nicée",
  47: "Clôture de l'Ascension",
  48: "Samedi des défunts",
  49: "Dimanche de la Pentecôte",
  50: "Lundi du Saint-Esprit",
  56: "Dimanche de tous les saints",
};

const SEMAINES_TRIODE = [[-69, -64, "semaine du Publicain et du Pharisien"], [-62, -58, "semaine du Fils prodigue"], [-55, -51, "semaine de la Tyrophagie"]];

function afterPentecost(days, wd) {
  if (wd === 0) return `${ordinal(days / 7)} dimanche après la Pentecôte`;
  return `${JOURS[wd]} de la ${ordinal(Math.floor((days - 1) / 7) + 1, true)} semaine après la Pentecôte`;
}

export function titreCycle({ pd, wd, j, year, override }) {
  if (pd === -77) return override?.label === "Dimanche de la Cananéenne" ? override.label : "Dimanche de Zachée";
  if (PROPRES[pd]) return PROPRES[pd];
  const triode = SEMAINES_TRIODE.find(([from, to]) => from <= pd && pd <= to);
  if (triode) return `${JOURS[wd]} de la ${triode[2]}`;
  if (pd >= -48 && pd <= -9) {
    const week = Math.floor((pd + 48) / 7) + 1;
    return wd === 6 ? `${ordinal(week)} samedi du Grand Carême` : `${JOURS[wd]} de la ${ordinal(week, true)} semaine du Grand Carême`;
  }
  if (pd >= 1 && pd <= 6) return `${JOURS[wd]} de la semaine lumineuse`;
  if (pd >= 8 && pd <= 48) return `${JOURS[wd]} de la ${ordinal(Math.floor(pd / 7) + 1, true)} semaine de Pâques`;
  if (pd > 49) return afterPentecost(pd - 49, wd);
  return afterPentecost(j - year.previous - 49, wd);
}

const BOOKS = new Map(
  ["nt", "lxx"].flatMap((corpus) =>
    JSON.parse(readFileSync(path.join(root, "public", corpus, "books.json"), "utf8")).books.map((b) => [b.id, { ...b, corpus }]),
  ),
);
const verseSets = new Map();

function versesOf(book, chapter) {
  const key = `${book}/${chapter}`;
  if (!verseSets.has(key)) {
    const file = path.join(root, "public", BOOKS.get(book).corpus, book, `${chapter}.json`);
    verseSets.set(key, existsSync(file) ? new Set(JSON.parse(readFileSync(file, "utf8")).mots.map((m) => m.verse)) : null);
  }
  return verseSets.get(key);
}

function runs(verses, from, to) {
  const result = [];
  for (let v = from; v <= to; v++) {
    if (!verses.has(v)) continue;
    const last = result.at(-1);
    if (last && last.to === v - 1) last.to = v;
    else result.push({ from: v, to: v });
  }
  return result;
}

function parsePieces(ref) {
  const pieces = [];
  let book = null;
  let chapter = null;
  for (const part of ref.split(/\s*;\s*/)) {
    const match = part.match(/^([1-3]?[a-z]+)\s+(.*)$/);
    let rest = part;
    if (match && BOOKS.has(match[1])) {
      book = match[1];
      chapter = BOOKS.get(book).chapters === 1 ? 1 : null;
      rest = match[2];
    }
    for (const token of rest.split(/\s*,\s*/)) {
      const [start, end = start] = token.split("-");
      const [c1, v1] = start.includes(".") ? start.split(".").map(Number) : [chapter, Number(start)];
      const [c2, v2] = end.includes(".") ? end.split(".").map(Number) : [c1, Number(end)];
      if (!book || !c1 || !v1 || !v2) throw new Error(`référence illisible : ${ref}`);
      pieces.push({ book, c1, v1, c2, v2 });
      chapter = c2;
    }
  }
  return pieces;
}

function passagesOf(pieces) {
  return pieces.flatMap(({ book, c1, v1, c2, v2 }) => {
    const corpus = BOOKS.get(book).corpus;
    const segments = [];
    for (let chapter = c1; chapter <= c2; chapter++) {
      const verses = versesOf(book, chapter);
      const from = chapter === c1 ? v1 : 1;
      const to = chapter === c2 ? v2 : verses ? Math.max(...verses) : from;
      const found = verses ? runs(verses, from, to) : [];
      if (!found.length) segments.push({ corpus, book, chapter, from, to, absent: true });
      for (const run of found) segments.push({ corpus, book, chapter, ...run });
    }
    return segments;
  });
}

function displayOf(pieces) {
  const groups = [];
  for (const piece of pieces) {
    const last = groups.at(-1);
    if (last && last.book === piece.book) last.pieces.push(piece);
    else groups.push({ book: piece.book, pieces: [piece] });
  }
  return groups.map(({ book, pieces: list }) => `${BOOKS.get(book).name} ${chapters(book, list)}`).join(" ; ");
}

function chapters(book, list) {
  const single = BOOKS.get(book).chapters === 1;
  const span = ({ v1, v2 }) => (v1 === v2 ? `${v1}` : `${v1}-${v2}`);
  const out = [];
  let current = null;
  for (const piece of list) {
    const text = piece.c1 === piece.c2 ? span(piece) : `${piece.v1} – ${piece.c2}, ${piece.v2}`;
    if (current === piece.c1) out[out.length - 1] += `.${text}`;
    else out.push(single ? text : `${piece.c1}, ${text}`);
    current = piece.c2;
  }
  return out.join(" ; ");
}

const KINDS = { apotre: "Apôtre", evangile: "Évangile" };

function reading(kind, ref, label = KINDS[kind]) {
  const pieces = parsePieces(ref);
  return { kind, label, ref: displayOf(pieces), passages: passagesOf(pieces) };
}

function readingsOf(set) {
  return ["apotre", "evangile"].filter((k) => set[k]).map((k) => reading(k, set[k]));
}

const mmdd = (j) => {
  const { m, d } = jdnToDate(j);
  return `${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
};

function fixedSets(j) {
  return (MENEE[mmdd(j)] ?? []).map((s) => ({ ...s, origine: "fixe" }));
}

function floatSets(c) {
  const entry = FLOTTANTES[c.floatIndex];
  if (!entry) return [];
  return entry.sets.map(({ nom, ...s }) => ({ ...s, nom: nom ?? entry.nom, titre: entry.nom, origine: "flottante" }));
}

function cycleEntry(pdist) {
  if (pdist >= 1000) return FLOTTANTES[pdist]?.sets[0] ?? {};
  return CYCLE[pdist] ?? {};
}

function cycleSets(c, titre) {
  if (!c.hasDaily) return [];
  const jour = { apotre: c.epistle === null ? null : cycleEntry(c.epistle).apotre, evangile: c.gospel === null ? null : cycleEntry(c.gospel).evangile };
  const sets = [];
  if (jour.apotre || jour.evangile) sets.push({ ...jour, nom: titre, ordre: 11, origine: "cycle" });
  const noMemorial = [-36, -29, -22].includes(c.pd) && ["03-09", "03-24", "03-25", "03-26"].includes(mmdd(c.j));
  for (const autre of CYCLE[c.pd]?.autres ?? []) {
    if (autre.role === "defunts" && noMemorial) continue;
    sets.push({ ...autre, origine: "cycle" });
  }
  return sets.sort((a, b) => a.ordre - b.ordre);
}

function cycleScore({ pd, wd }) {
  if ([-7, 0, 39, 49].includes(pd) || (pd >= -6 && pd <= -1)) return 10;
  if (pd === -8) return 9;
  if (pd >= 1 && pd <= 6) return 8;
  if ((wd === 0 && pd >= -70 && pd <= 56) || [-57, -50, 24, 38, 48, 50].includes(pd)) return 6;
  return wd === 0 ? 5 : 1;
}

function fixedScore(rang) {
  if (rang >= 8) return 9;
  if (rang === 7) return 8;
  if (rang === 6) return 7.5;
  return rang >= 3 ? 3 : 0.5;
}

const isLentWeekday = ({ pd, wd }) => pd >= -48 && pd <= -9 && wd >= 1 && wd <= 5;
const NOTE = "Pas de Divine Liturgie ce jour";

function presanctified(c, fixed, titre) {
  const entry = CYCLE[c.pd] ?? {};
  const readings = (entry.lectures ?? []).map((ref) => reading("lecture", ref, "Lecture (Présanctifiés)"));
  if (entry.evangile) readings.push(reading("evangile", entry.evangile));
  const saints = isLentWeekday(c) ? fixed.filter((s) => s.rang >= 3) : [];
  for (const s of saints) readings.push(...readingsOf(s));
  return day(titre, saints, [{ readings }], `${NOTE} ; Liturgie des Présanctifiés`);
}

function day(title, others, masses, note) {
  const result = { title };
  const inTitle = (n) => title.toLowerCase().includes(n.toLowerCase());
  const detail = [...new Set(others.map((s) => s.nom).filter((n) => n && !inTitle(n)))].join(" ; ");
  if (detail) result.detail = detail;
  if (note) result.note = note;
  result.masses = masses;
  return result;
}

function aliturgical(c, fixed, titre) {
  const lent = isLentWeekday(c);
  const presanct = (lent && (c.wd === 3 || c.wd === 5 || c.pd === -17)) || (c.pd >= -6 && c.pd <= -4);
  if (presanct || (lent && fixed.some((s) => s.rang >= 4))) return presanctified(c, fixed, titre);
  if (lent || [-53, -51, -2].includes(c.pd)) return day(titre, [], [], NOTE);
  const royal = FLOTTANTES[c.floatIndex];
  if ([1013, 1025].includes(c.floatIndex)) return day(royal.nom, [], [], NOTE);
  return null;
}

const SECONDARY_FLOATS = [1020, 1023];
const isJour = (s) => s.origine === "cycle" && s.ordre === 11;

function rank(c, fixed, floats, cycle) {
  const cs = cycleScore(c);
  const minor = c.wd === 0 || floats.length > 0;
  const keep = fixed.filter((s) => s.rang >= (cs >= 9 ? 7 : cs >= 8 ? 4 : minor ? 3 : 0));
  const majors = keep.filter((s) => s.rang >= 7);
  if (majors.length && cs <= 5) return majors.map((s) => ({ ...s, score: fixedScore(s.rang) }));
  const scored = [
    ...floats.map((s) => ({ ...s, score: SECONDARY_FLOATS.includes(c.floatIndex) ? 2 : 7 })),
    ...(floats.length && !SECONDARY_FLOATS.includes(c.floatIndex) ? cycle.filter((s) => s.ordre !== 11) : cycle).map((s) => ({ ...s, score: cs })),
    ...keep.map((s) => ({ ...s, score: fixedScore(s.rang) })),
  ];
  return scored.map((s, i) => ({ ...s, i })).sort((a, b) => b.score - a.score || a.i - b.i);
}

function dedupe(sets) {
  const seen = new Set();
  return sets
    .map((s) => {
      const out = { ...s };
      for (const k of ["apotre", "evangile"]) {
        if (!out[k]) continue;
        if (seen.has(out[k])) delete out[k];
        else seen.add(out[k]);
      }
      return out;
    })
    .filter((s) => s.apotre || s.evangile);
}

export function liturgyOf(j, comput = paquesGregoriennes) {
  const c = cycleOf(j, comput);
  const titre = titreCycle(c);
  const fixed = fixedSets(j);
  const floatsOfDay = [1013, 1025].includes(c.floatIndex) ? [] : floatSets(c);
  const alit = !fixed.some((s) => s.rang >= 7) && aliturgical(c, fixed, titre);
  if (alit) return alit;
  const sets = dedupe(rank(c, fixed, floatsOfDay, cycleSets(c, titre)));
  if (!sets.length) return day(titre, [], [], NOTE);
  const title = titleOf(sets, titre);
  const others = sets.filter((s) => s.origine === "fixe" || s.role === "fete");
  if (c.override?.label && sets.some(isJour) && c.override.label !== title) others.unshift({ nom: c.override.label });
  const masses = sets.map((s) => ({ name: s.nom, readings: readingsOf(s) }));
  if (masses.length === 1) delete masses[0].name;
  return day(title, others, masses);
}

function titleOf(sets, titre) {
  const top = sets[0];
  if (top.origine === "cycle") return titre;
  if (top.origine === "flottante") return top.titre;
  return top.rang >= 6 || !sets.some(isJour) ? top.nom : titre;
}

function generate(year) {
  const days = {};
  for (let j = gregorianJdn(year, 1, 1); j <= gregorianJdn(year, 12, 31); j++) {
    const { y, m, d } = jdnToDate(j);
    days[`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`] = liturgyOf(j);
  }
  return { rite: "byzantin", source: SOURCE, days };
}

function main() {
  const [from = 2025, to = 2030] = process.argv.slice(2).map(Number);
  mkdirSync(outDir, { recursive: true });
  for (let year = from; year <= to; year++) {
    writeFileSync(path.join(outDir, `${year}.json`), JSON.stringify(generate(year)));
    console.log(`${year} écrit`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
