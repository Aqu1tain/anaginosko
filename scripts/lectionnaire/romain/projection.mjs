import { capitalize } from "./aelf.mjs";

// Table du lectionnaire apprise des jours AELF connus, indexée par la célébration
// que donne le calendrier (romcal), puis projetée sur les jours non publiés.

const COLORS = { WHITE: "blanc", GREEN: "vert", RED: "rouge", PURPLE: "violet", ROSE: "rose", BLACK: "noir", GOLD: "or" };
const DAYS = { monday: "Lundi", tuesday: "Mardi", wednesday: "Mercredi", thursday: "Jeudi", friday: "Vendredi", saturday: "Samedi" };
const SEASONS = { ordinary_time: "du temps ordinaire", easter_time: "du temps pascal", lent: "de Carême", advent: "de l'Avent" };
const POSITIONS = ["Première lecture", "Psaume", "Deuxième lecture", "Évangile"];
const WEEKDAY_TITLE = /^(Lundi|Mardi|Mercredi|Jeudi|Vendredi|Samedi|Férie)\b|jour dans l'octave/i;

const passageKey = (p) => `${p.corpus}/${p.book}/${p.chapter}/${p.from}-${p.to}${p.absent ? "!" : ""}`;
const readingKey = (r) => `${r.kind}:${r.alternative ? "*" : ""}${r.passages.map(passageKey).join(",")}`;
export const massesKey = (masses) => masses.map((m) => `${m.name ?? ""}=${m.readings.map(readingKey).join("|")}`).join("||");
const looseKey = (masses) => masses.flatMap((m) => m.readings.map(readingKey)).sort().join("|");

const isMemorial = (e) => e.rank === "MEMORIAL" && Boolean(e.weekday);
const ferieCycle = (weekday, e) => (weekday.season === "ORDINARY_TIME" ? e.wc : "");
const ferieKey = (e) => `${e.weekday.id}|${ferieCycle(e.weekday, e)}`;
const sameSundayness = (a, b) => (a.dow === 0) === (b.dow === 0);

const plain = (s) => s.replace(/’/g, "'").replace(/\bEpiphanie\b/g, "Épiphanie");
const cleanName = (s) => plain(s.replace(/\s*\([^)]*\)/g, "")).trim();
const tidy = (s) =>
  s &&
  plain(s)
    .replace(/\bSs\s+/g, "Saints ")
    .replace(/\bSte\.\s*/g, "Sainte ")
    .replace(/,?\s*†\s*\d+/g, "")
    .replace(/\.,/g, ",")
    .replace(/\.\s*(Mémoires? facultatives?|Mémoire)\b/g, (_, m) => `, ${m.toLowerCase()}`)
    .replace(/ : /g, " ; ")
    .replace(/mémoires facultatives/g, "mémoire facultative")
    .replace(/(, mémoire facultative)+/g, ", mémoire facultative");

function groupBy(list, keyOf) {
  const out = new Map();
  for (const item of list) {
    const key = keyOf(item);
    if (!out.has(key)) out.set(key, []);
    out.get(key).push(item);
  }
  return out;
}

// L'AELF fait évoluer sa pratique (lectures propres d'une mémoire, écriture des
// références) : seules comptent les trois dernières occurrences, la plus récente
// départageant.
const RECENT = 3;

function mostCommon(list, keyOf) {
  const recent = list.slice(-RECENT);
  const counts = new Map();
  for (const item of recent) counts.set(keyOf(item), (counts.get(keyOf(item)) ?? 0) + 1);
  return recent.reduce((best, item) => (counts.get(keyOf(item)) >= counts.get(keyOf(best)) ? item : best));
}

const position = (label) => (label === "Cantique" ? "Psaume" : label);
const byPosition = (a, b) => POSITIONS.indexOf(a) - POSITIONS.indexOf(b);

function slotsOf(readings) {
  const out = [];
  for (const r of readings) {
    if (r.alternative && out.length) out[out.length - 1].readings.push(r);
    else out.push({ label: position(r.label), readings: [r] });
  }
  return out;
}
const slotKey = (slot) => slot.readings.map(readingKey).join("|");
const singleMass = (day) => (day.masses.length === 1 && !day.masses[0].name ? day.masses[0].readings : null);
const fromSlots = (slots) => ({ masses: [{ readings: slots.flatMap((s) => s.readings) }] });

function canonicalTitle(id) {
  if (id === "sunday_of_the_word_of_god") return "3e dimanche du temps ordinaire";
  const m = id.match(/^(ordinary_time|easter_time|lent|advent)_(\d+)_(\w+)$/);
  if (!m) return null;
  const [, season, week, day] = m;
  if (day === "sunday") return season === "ordinary_time" ? `${week}e dimanche du temps ordinaire` : null;
  return `${DAYS[day]}, ${week === "1" ? "1re" : `${week}e`} semaine ${SEASONS[season]}`;
}

// Le cycle qui fait varier les lectures : année I/II pour les fériés du temps
// ordinaire ; année A/B/C pour un dimanche, ou pour une fête dont les lectures
// changent d'une année à l'autre (à jour de semaine égal) ou ne sont connues que
// pour une seule année du cycle ; aucun sinon.
function dimension(list) {
  const [first] = list;
  if (first.rank === "WEEKDAY") return first.season === "ORDINARY_TIME" ? "wc" : null;
  if (first.rank === "SUNDAY" || new Set(list.map((o) => o.sc)).size < 2) return "sc";
  const uniform = (group) => new Set(group.map((o) => looseKey(o.day.masses))).size <= 1;
  return uniform(list.filter((o) => o.dow === 0)) && uniform(list.filter((o) => o.dow !== 0)) ? null : "sc";
}

function pick(list, target, dim) {
  const score = (o) => (dim && o[dim] === target[dim] ? 2 : 0) + (sameSundayness(o, target) ? 1 : 0);
  const best = Math.max(...list.map(score));
  if (dim && best < 2) return null;
  return mostCommon(
    list.filter((o) => score(o) === best),
    (o) => massesKey(o.day.masses),
  );
}

// Une mémoire prend en général les lectures de la férie ; une lecture propre se
// reconnaît à ce qu'elle diffère de la férie, ou revient d'une année à l'autre
// sur des féries différentes.
function properSlots(list, ferieSlotKeys) {
  const votes = new Map();
  for (const o of list) {
    const readings = singleMass(o.day);
    if (!readings) continue;
    const ferie = ferieSlotKeys(ferieKey(o));
    for (const slot of slotsOf(readings)) {
      const vote = votes.get(slot.label) ?? { ferie: 0, proper: [] };
      votes.set(slot.label, vote);
      const known = ferie?.get(slot.label);
      if (known === slotKey(slot)) vote.ferie++;
      else vote.proper.push({ slot, key: slotKey(slot), ferie: ferieKey(o), known: known !== undefined });
    }
  }
  const out = new Map();
  for (const [label, { ferie, proper }] of votes) {
    if (!proper.length) continue;
    const weight = (key) => {
      const same = proper.filter((p) => p.key === key);
      const repeated = new Set(same.map((p) => p.ferie)).size > 1;
      return same.filter((p) => p.known || repeated).length;
    };
    const best = proper.reduce((a, b) => (weight(b.key) >= weight(a.key) ? b : a));
    if (weight(best.key) > ferie) out.set(label, best.slot);
  }
  return out;
}

// Un jour que le calendrier tient pour une férie mais que l'AELF titre autrement
// (lectures propres d'une mémoire facultative, solennité déplacée) ne dit rien
// de la férie : il n'entre pas dans la table.
const agrees = (o) => o.rank !== "WEEKDAY" || WEEKDAY_TITLE.test(o.day.title);

export function learn(observations) {
  const sorted = observations.filter(agrees).sort((a, b) => a.iso.localeCompare(b.iso));
  const celebrations = groupBy(sorted.filter((o) => !isMemorial(o)), (o) => o.id);
  const memorials = groupBy(sorted.filter(isMemorial), (o) => o.id);
  const dimensions = new Map([...celebrations].map(([id, list]) => [id, dimension(list)]));
  const unimpeded = groupBy(sorted.filter((o) => o.rank === "WEEKDAY"), (o) => `${o.id}|${ferieCycle(o, o)}`);

  const unimpededSlots = (key) => {
    const list = unimpeded.get(key);
    const readings = list && singleMass(mostCommon(list, (o) => massesKey(o.day.masses)).day);
    return readings ? slotsOf(readings) : null;
  };
  const slotKeys = (slots) => slots && new Map(slots.map((s) => [s.label, slotKey(s)]));
  const propers = new Map([...memorials].map(([id, list]) => [id, properSlots(list.slice(-RECENT), (key) => slotKeys(unimpededSlots(key)))]));

  const ferieFromMemorials = new Map();
  for (const o of sorted.filter(isMemorial)) {
    const readings = singleMass(o.day);
    if (!readings) continue;
    const slots = ferieFromMemorials.get(ferieKey(o)) ?? new Map();
    ferieFromMemorials.set(ferieKey(o), slots);
    for (const slot of slotsOf(readings)) if (!propers.get(o.id).has(slot.label)) slots.set(slot.label, slot);
  }
  const ferieSlots = (key) => {
    const known = unimpededSlots(key);
    if (known || !ferieFromMemorials.has(key)) return known;
    return [...ferieFromMemorials.get(key).values()].sort((a, b) => byPosition(a.label, b.label));
  };

  const titles = new Map();
  const ferieTitles = new Map();
  const ownTitles = new Map();
  const details = new Map();
  const refs = new Map();
  for (const o of sorted) {
    const key = detailKey(o);
    if (key) details.set(key, tidy(o.day.detail));
    if (!isMemorial(o)) titles.set(o.id, plain(o.day.title));
    else if (WEEKDAY_TITLE.test(o.day.title)) {
      ferieTitles.set(o.weekday.id, plain(o.day.title));
      ownTitles.delete(o.id);
    } else ownTitles.set(o.id, plain(o.day.title));
    for (const r of o.day.masses.flatMap((m) => m.readings)) {
      if (!refs.has(readingKey(r))) refs.set(readingKey(r), []);
      refs.get(readingKey(r)).push(r.ref);
    }
  }
  const colors = new Map(
    [...groupBy(sorted.filter((o) => o.day.color), (o) => o.id)].map(([id, list]) => [id, mostCommon(list, (o) => o.day.color).day.color]),
  );

  return { celebrations, memorials, dimensions, propers, ferieSlots, titles, ferieTitles, ownTitles, details, refs, colors };
}

// Certaines années, l'AELF omet le numéro hébreu d'un psaume : on reprend la
// dernière écriture connue qui le donne.
function preferredRef(table, r) {
  if (r.kind !== "psaume" || /^Psaume \d+\w* ?\(\d/.test(r.ref)) return r.ref;
  return (table.refs.get(readingKey(r)) ?? []).filter((ref) => /^Psaume \d+\w* ?\(\d/.test(ref)).at(-1) ?? r.ref;
}

function detailKey(e) {
  if (isMemorial(e)) return `S:${e.id}`;
  if (e.rank !== "WEEKDAY") return `M:${e.id}`;
  return e.optional.length ? `S:${e.optional.map((o) => o.id).join("+")}` : null;
}

const uncapitalizeSaint = (s) => s.replace(/^(Saint|Sainte|Saints|Saintes|Bienheureux|Bienheureuse)\b/, (w) => w.toLowerCase());

function generatedDetail(e) {
  if (isMemorial(e)) return `${cleanName(e.name)}, mémoire`;
  if (e.rank !== "WEEKDAY") return { FEAST: "Fête", SOLEMNITY: "Solennité" }[e.rank];
  const names = e.optional.map((o, i) => (i ? uncapitalizeSaint(cleanName(o.name)) : cleanName(o.name)));
  return `${names.join(" ; ")}, mémoire facultative`;
}

// Une fête du Seigneur un dimanche garde la forme qu'elle a le dimanche ; seules
// les lectures qui suivent le cycle viennent de l'année qui convient.
function sundayForm(list, picked, e) {
  const shape = list.some((o) => sameSundayness(o, e)) && pick(list.filter((o) => sameSundayness(o, e)), e, null);
  const own = singleMass(picked.day);
  const target = shape && singleMass(shape.day);
  if (!own || !target) return picked.day;
  const slotSets = (group) => group.map((o) => singleMass(o.day)).filter(Boolean).map(slotsOf);
  const groups = [list.filter((o) => o.dow === 0), list.filter((o) => o.dow !== 0)].map(slotSets);
  const lead = (slots, label) => slots.find((s) => s.label === label)?.readings[0].passages.map(passageKey).join(",");
  const variesIn = (group, label) => new Set(group.map((slots) => lead(slots, label))).size > 1;
  const varies = (label) => groups.some((group) => variesIn(group, label));
  const ownSlots = new Map(slotsOf(own).map((s) => [s.label, s]));
  return fromSlots(slotsOf(target).map((s) => (varies(s.label) && ownSlots.has(s.label) ? ownSlots.get(s.label) : s)));
}

const isComplete = (slots) => ["Première lecture", "Psaume", "Évangile"].every((label) => slots.some((s) => s.label === label));

function celebrationMasses(table, e) {
  const list = table.celebrations.get(e.id);
  const dim = table.dimensions.get(e.id);
  const picked = list && pick(list, e, dim);
  if (picked) return dim === "sc" && !sameSundayness(picked, e) ? sundayForm(list, picked, e) : picked.day;
  if (e.rank !== "WEEKDAY") return null;
  const slots = table.ferieSlots(`${e.id}|${ferieCycle(e, e)}`);
  return slots && isComplete(slots) ? fromSlots(slots) : null;
}

function memorialMasses(table, e) {
  const proper = table.propers.get(e.id) ?? new Map();
  const ferie = new Map((table.ferieSlots(ferieKey(e)) ?? []).map((s) => [s.label, s]));
  const latest = singleMass(table.memorials.get(e.id)?.at(-1)?.day ?? { masses: [] }) ?? [];
  const labels = ferie.size ? [...new Set([...ferie.keys(), ...proper.keys()])].sort(byPosition) : slotsOf(latest).map((s) => s.label);
  if (!labels.length || labels.some((label) => !proper.has(label) && !ferie.has(label))) return null;
  return fromSlots(labels.map((label) => proper.get(label) ?? ferie.get(label)));
}

function titleOf(table, e) {
  const learned = (id) => canonicalTitle(id) ?? table.titles.get(id) ?? table.ferieTitles.get(id);
  if (!isMemorial(e)) return learned(e.id) ?? capitalize(cleanName(e.name));
  return table.ownTitles.get(e.id) ?? learned(e.weekday.id) ?? capitalize(cleanName(e.weekday.name));
}

export function project(table, e) {
  const source = isMemorial(e) ? memorialMasses(table, e) : celebrationMasses(table, e);
  if (!source) return null;
  const day = { title: titleOf(table, e) };
  const key = detailKey(e);
  const detail = key && (table.details.has(key) ? table.details.get(key) : generatedDetail(e));
  if (detail) day.detail = detail;
  day.color = table.colors.get(e.id) ?? COLORS[e.color];
  if (source.note) day.note = source.note;
  day.projected = true;
  day.masses = source.masses.map((m) => ({ ...m, readings: m.readings.map((r) => ({ ...r, ref: preferredRef(table, r) })) }));
  return day;
}
