import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

// Cache local des références AELF (jamais les textes). L'AELF publie environ
// dix-huit mois à l'avance : on s'arrête au premier jour non publié.
// Usage : node fetch-aelf.mjs <dossier-cache> [année-début] [année-fin]

const [dir, fromYear = "2025", toYear = "2030"] = process.argv.slice(2);
if (!dir) throw new Error("usage : node fetch-aelf.mjs <dossier-cache> [année-début] [année-fin]");
mkdirSync(dir, { recursive: true });

const pad = (n) => String(n).padStart(2, "0");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchDay(iso) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const r = await fetch(`https://api.aelf.org/v1/messes/${iso}/france`, { signal: AbortSignal.timeout(20000) });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(String(r.status));
      return await r.json();
    } catch (e) {
      console.error(iso, e.message);
      await sleep(3000 * (attempt + 1));
    }
  }
  throw new Error(`${iso} : échec après 4 essais`);
}

const slim = (j) => ({
  informations: j.informations,
  messes: (j.messes ?? []).map((m) => ({
    nom: m.nom,
    lectures: (m.lectures ?? []).filter(Boolean).map((l) => ({ type: l.type, ref: l.ref })),
  })),
});

for (let d = new Date(Date.UTC(Number(fromYear), 0, 1)); d < new Date(Date.UTC(Number(toYear) + 1, 0, 1)); d.setUTCDate(d.getUTCDate() + 1)) {
  const iso = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  const out = path.join(dir, `${iso}.json`);
  if (existsSync(out)) continue;
  const day = await fetchDay(iso);
  if (!day) {
    console.log(`Pas encore publié à partir du ${iso}`);
    break;
  }
  writeFileSync(out, JSON.stringify(slim(day)));
  await sleep(250);
}
