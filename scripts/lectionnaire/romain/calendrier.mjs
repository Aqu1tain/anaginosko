import { Romcal } from "romcal";
import { France_Fr } from "@romcal/calendar.france";

// Calendrier liturgique de France calculé par romcal (licence MIT), avec deux
// corrections constatées sur les jours publiés par l'AELF.

const CYCLES = { YEAR_A: "A", YEAR_B: "B", YEAR_C: "C", YEAR_1: 1, YEAR_2: 2 };
const DEDICATION = "dedication_of_consecrated_churches";

const romcal = new Romcal({ localizedCalendar: France_Fr, outputOptions: { calculateProperties: true } });

const celebration = ({ id, rank, name, colors, seasons }) => ({ id, rank, name, color: colors[0], season: seasons[0] });

function entry(iso, [main, ...others]) {
  return {
    iso,
    dow: new Date(iso).getUTCDay(),
    ...celebration(main),
    sc: CYCLES[main.cycles.sundayCycle],
    wc: CYCLES[main.cycles.weekdayCycle],
    weekday: main.weekday ? celebration(main.weekday) : null,
    optional: others.filter((o) => o.id !== DEDICATION).map(celebration),
  };
}

function lastSundayOfOctober(year) {
  const d = new Date(Date.UTC(year, 9, 31));
  d.setUTCDate(31 - d.getUTCDay());
  return d.toISOString().slice(0, 10);
}

// En France, la dédicace des églises dont on ignore la date de consécration est
// une solennité que l'AELF place depuis 2018 au dernier dimanche d'octobre
// (romcal la laisse au 25 octobre).
function withDedication(days, year) {
  const iso = lastSundayOfOctober(year);
  const sunday = days.get(iso);
  if (year < 2018 || !sunday) return;
  const { id, rank, name, color, season } = sunday;
  days.set(iso, {
    ...sunday,
    id: DEDICATION,
    rank: "SOLEMNITY",
    name: "Dédicace des églises consacrées dont on ne connaît pas la date de consécration",
    color: "WHITE",
    weekday: { id, rank, name, color, season },
  });
}

// romcal laisse la mémoire du Cœur immaculé de Marie effacer une solennité du
// sanctoral (Nativité de saint Jean Baptiste, saints Pierre et Paul) : l'année où
// elle manque, la solennité reprend sa date habituelle, comme à l'AELF.
function withSolemnities(days, solemnities) {
  for (const { main, dates } of solemnities.values()) {
    const counts = new Map();
    for (const iso of dates) counts.set(iso.slice(5), (counts.get(iso.slice(5)) ?? 0) + 1);
    const usual = [...counts].reduce((a, b) => (b[1] > a[1] ? b : a))[0];
    const years = new Set(dates.map((iso) => iso.slice(0, 4)));
    for (const [iso, day] of days) {
      if (day.rank === "MEMORIAL" && iso.slice(5) === usual && !years.has(iso.slice(0, 4))) days.set(iso, { ...day, ...celebration(main), optional: [] });
    }
  }
}

export async function liturgicalDays(fromYear, toYear) {
  const days = new Map();
  const solemnities = new Map();
  for (let year = fromYear; year <= toYear; year++) {
    const calendar = await romcal.generateCalendar(year);
    for (const [iso, items] of Object.entries(calendar)) {
      days.set(iso, entry(iso, items));
      const [main] = items;
      if (main.rank !== "SOLEMNITY" || main.cycles.properCycle !== "PROPER_OF_SAINTS") continue;
      if (!solemnities.has(main.id)) solemnities.set(main.id, { main, dates: [] });
      solemnities.get(main.id).dates.push(iso);
    }
    withDedication(days, year);
  }
  withSolemnities(days, solemnities);
  return days;
}
