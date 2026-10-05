import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { root, readCache, readComplements, unresolved } from "./aelf.mjs";
import { liturgicalDays } from "./calendrier.mjs";
import { learn, project } from "./projection.mjs";

// Lectionnaire de la forme ordinaire (calendrier de France). L'AELF fait foi pour
// chaque jour publié ; au-delà, les lectures sont projetées par le calendrier.
// Usage : node build.mjs <dossier-cache> [année-début] [année-fin]

const [cacheDir, fromYear = "2025", toYear = "2030"] = process.argv.slice(2);
if (!cacheDir) throw new Error("usage : node build.mjs <dossier-cache> [année-début] [année-fin]");

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const frenchDate = (iso) => `${Number(iso.slice(8))} ${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
const pad = (n) => String(n).padStart(2, "0");

const aelf = readCache(cacheDir);
const lastAelf = [...aelf.keys()].at(-1);
const learned = new Map([...readComplements(), ...aelf]);
const calendar = await liturgicalDays(Number([...learned.keys()][0].slice(0, 4)), Math.max(Number(toYear), Number(lastAelf.slice(0, 4))));
const table = learn([...learned].map(([iso, day]) => ({ ...calendar.get(iso), day })));

const outDir = path.join(root, "data/lectionnaire/romain");
mkdirSync(outDir, { recursive: true });
const missing = [];

for (let year = Number(fromYear); year <= Number(toYear); year++) {
  const days = {};
  let projected = 0;
  for (let d = new Date(Date.UTC(year, 0, 1)); d.getUTCFullYear() === year; d.setUTCDate(d.getUTCDate() + 1)) {
    const iso = `${year}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
    if (aelf.has(iso)) {
      days[iso] = aelf.get(iso);
      continue;
    }
    if (iso < lastAelf) continue;
    const day = project(table, calendar.get(iso));
    if (!day) {
      missing.push(`${iso} ${calendar.get(iso).id}`);
      continue;
    }
    days[iso] = day;
    projected++;
  }
  const source = projected
    ? `AELF, calendrier liturgique de France ; jours après le ${frenchDate(lastAelf)} calculés`
    : "AELF, calendrier liturgique de France";
  writeFileSync(path.join(outDir, `${year}.json`), JSON.stringify({ rite: "romain", source, days }));
  console.log(year, Object.keys(days).length, "jours dont", projected, "calculés");
}
if (missing.length) console.log("Jours sans lectures connues :", missing.join(" | "));
if (unresolved.length) console.log("Références non résolues :", [...new Set(unresolved)].join(" | "));
