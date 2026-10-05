import { readCache, readComplements } from "./aelf.mjs";
import { liturgicalDays } from "./calendrier.mjs";
import { learn, project, massesKey } from "./projection.mjs";

// Validation : table apprise sur les jours AELF antérieurs à la coupure, projetée
// sur les jours AELF suivants, puis comparée à ce que publie l'AELF.
// Usage : node valider.mjs <dossier-cache> [coupure=2027-01-01]

const [cacheDir, cutoff = "2027-01-01"] = process.argv.slice(2);
if (!cacheDir) throw new Error("usage : node valider.mjs <dossier-cache> [coupure]");

const aelf = readCache(cacheDir);
const learned = new Map([...readComplements(), ...aelf]);
const known = [...learned.keys()];
const calendar = await liturgicalDays(Number(known[0].slice(0, 4)), Number(known.at(-1).slice(0, 4)));
const table = learn(known.filter((iso) => iso < cutoff).map((iso) => ({ ...calendar.get(iso), day: learned.get(iso) })));

const refsKey = (masses) =>
  masses.map((m) => `${m.name ?? ""}=${m.readings.map((r) => `${r.label}:${r.alternative ? "*" : ""}${r.ref}`).join(" | ")}`).join(" || ");

function category(e) {
  if (e.rank === "MEMORIAL" && e.weekday) return "mémoire";
  if (e.rank === "WEEKDAY") return e.season === "ORDINARY_TIME" ? "férie du temps ordinaire" : "férie d'un autre temps";
  if (e.rank === "SUNDAY") return "dimanche";
  return "fête ou solennité";
}

const stats = { jours: 0, références: 0, passages: 0, titre: 0, détail: 0, couleur: 0 };
const gaps = new Map();
for (const iso of [...aelf.keys()].filter((d) => d >= cutoff)) {
  const e = calendar.get(iso);
  const expected = aelf.get(iso);
  const got = project(table, e) ?? { masses: [] };
  stats.jours++;
  if (got.title === expected.title) stats.titre++;
  if (got.detail === expected.detail) stats.détail++;
  if (got.color === expected.color) stats.couleur++;
  if (refsKey(got.masses) === refsKey(expected.masses)) {
    stats.références++;
    stats.passages++;
    continue;
  }
  const samePassages = massesKey(got.masses) === massesKey(expected.masses);
  if (samePassages) stats.passages++;
  const kind = `${category(e)}, ${samePassages ? "mêmes passages, références écrites autrement" : got.masses.length ? "lectures différentes" : "aucune projection"}`;
  if (!gaps.has(kind)) gaps.set(kind, []);
  gaps.get(kind).push(`${iso} ${e.id}\n      AELF   : ${refsKey(expected.masses)}\n      calcul : ${refsKey(got.masses)}`);
}

const pct = (n) => `${((100 * n) / stats.jours).toFixed(1)} %`;
console.log(`${stats.jours} jours comparés à partir du ${cutoff}`);
console.log(`Mêmes références : ${stats.références} (${pct(stats.références)}) ; mêmes passages : ${stats.passages} (${pct(stats.passages)})`);
console.log(`Titre identique : ${pct(stats.titre)} ; détail : ${pct(stats.détail)} ; couleur : ${pct(stats.couleur)}`);
for (const [kind, list] of gaps) console.log(`\n${kind} : ${list.length}\n  ${list.join("\n  ")}`);
