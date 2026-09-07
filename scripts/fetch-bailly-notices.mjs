// Récupère la notice complète Bailly (htmlDefinition) de chaque uri présente dans
// les gloses NT et LXX, et l'écrit dans public/bailly/<uri encodée>.json.
// api.bailly.app refuse les requêtes du VPS (403 Cloudflare) : les notices sont
// donc figées ici, depuis un poste autorisé, et servies comme données statiques.
// CC BY-NC-ND : reproduites sans modification, attribution dans les mentions.
// Reprise possible : les fichiers déjà présents sont ignorés.
// Run: node scripts/fetch-bailly-notices.mjs
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { request } from "node:https";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(root, "public/bailly");
mkdirSync(out, { recursive: true });

// Nom de fichier ASCII, réversible et sûr sur un disque insensible à la casse :
// « % » devient « ~ » (hexa en minuscules), une majuscule devient « _ » + minuscule
// (Gaza → _gaza, gaza → gaza).
export const noticeFile = (uri) =>
  `${encodeURIComponent(uri)
    .replace(/%([0-9A-F]{2})/g, (_, h) => `~${h.toLowerCase()}`)
    .replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)}.json`;

const uris = new Set();
for (const corpus of ["nt", "lxx"]) {
  const glosses = JSON.parse(readFileSync(resolve(root, `public/${corpus}/glosses.json`), "utf8"));
  for (const g of Object.values(glosses)) if (g.uri) uris.add(g.uri);
}

const getJson = (path) =>
  new Promise((ok, ko) => {
    const req = request({ host: "api.bailly.app", path, family: 4, headers: { accept: "application/json" } }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        ko(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => ok(JSON.parse(Buffer.concat(chunks).toString("utf8"))));
      res.on("error", ko);
    });
    req.setTimeout(10000, () => req.destroy(new Error("timeout")));
    req.on("error", ko);
    req.end();
  });

// Même aplatissement que src/lib/bailly.ts (toBaillyNotice).
function toNotice(entry, uri) {
  if (!entry?.word) return null;
  const parts = entry.children?.length ? entry.children : [entry];
  const senses = parts.filter((e) => e.htmlDefinition?.trim()).map((e) => ({ word: e.word ?? entry.word, html: e.htmlDefinition }));
  return senses.length ? { word: entry.word, uri: entry.uri || uri, senses } : null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const list = [...uris];
let done = 0, ok = 0, missing = 0, failed = 0;
for (const uri of list) {
  const file = resolve(out, noticeFile(uri));
  if (existsSync(file)) { ok++; done++; continue; }
  try {
    const json = await getJson(`/entry/${encodeURIComponent(uri)}?fields=word,uri,htmlDefinition`);
    const notice = toNotice(json.data?.entry, uri);
    if (notice) { writeFileSync(file, JSON.stringify(notice)); ok++; } else missing++;
  } catch (e) {
    failed++;
    console.log(`échec ${uri}: ${e.message}`);
    await sleep(2000);
  }
  done++;
  if (done % 250 === 0) console.log(`… ${done}/${list.length} (${ok} notices, ${missing} absentes, ${failed} échecs)`);
  await sleep(120);
}
console.log(`Terminé : ${ok} notices sur ${list.length} uris (${missing} absentes, ${failed} échecs).`);
