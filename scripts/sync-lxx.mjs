// Synchronise le grec de la Septante vers le corpus servi, puis régénère le français
// des livres listés. Tourne sur le serveur, sous le compte du service, depuis la
// release. Rien n'est écrit dans le corpus servi tant que la régénération et les
// sentinelles n'ont pas réussi dans un dossier temporaire. Un fr.json n'est jamais
// copié : seuls ceux des livres listés sont réécrits, après sauvegarde.
//
//   node scripts/sync-lxx.mjs est[,dan]
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const release = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = process.env.LXX_GREEK_SRC ?? path.join(release, "lxx-greek");
const LXX = process.env.LXX_DATA_DIR ?? "/var/www/anaginosko/lxx";
const ARB = process.env.ARB_DIR ?? "/opt/anaginosko-web/arbitration";
const FRENCH = "fr.json";

function fail(message) {
  console.error(message);
  process.exit(1);
}

function greekFiles(dir, base = "") {
  return fs.readdirSync(path.join(dir, base), { withFileTypes: true }).flatMap((entry) => {
    const rel = path.join(base, entry.name);
    if (entry.isDirectory()) return greekFiles(dir, rel);
    return entry.isFile() && entry.name !== FRENCH ? [rel] : [];
  });
}

function install(data, to) {
  if (fs.existsSync(to) && data.equals(fs.readFileSync(to))) return false;
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.writeFileSync(`${to}.tmp`, data);
  fs.renameSync(`${to}.tmp`, to);
  return true;
}

function run(script, args, env) {
  const result = spawnSync(process.execPath, [path.join(release, "scripts", script), ...args], {
    env: { ...process.env, ...env },
    stdio: "inherit",
  });
  if (result.status !== 0) fail(`${script} a échoué : corpus servi inchangé.`);
}

const books = (process.argv[2] ?? "").split(",").filter(Boolean);
if (!books.length || books.some((b) => !/^[a-z0-9]+$/.test(b))) fail("usage : node scripts/sync-lxx.mjs <livre>[,<livre>]");
if (!fs.existsSync(path.join(SRC, "books.json"))) fail(`Grec absent : ${SRC}`);

const served = (book) => path.join(LXX, book, FRENCH);
const before = new Map();
for (const book of books) {
  if (!fs.statSync(path.join(SRC, book), { throwIfNoEntry: false })?.isDirectory()) fail(`Livre inconnu : ${book}`);
  if (!fs.existsSync(served(book))) fail(`Français absent du corpus servi : ${book}`);
  before.set(book, fs.readFileSync(served(book)));
}

const stage = fs.mkdtempSync(path.join(os.tmpdir(), "anag-lxx-"));
process.on("exit", () => fs.rmSync(stage, { recursive: true, force: true }));
for (const book of books) {
  for (const rel of greekFiles(SRC, book)) install(fs.readFileSync(path.join(SRC, rel)), path.join(stage, rel));
  install(before.get(book), path.join(stage, book, FRENCH));
}
const env = { LXX_DATA_DIR: stage, ARB_DIR: ARB, LXX_BOOKS: books.join(",") };
run("materialize-links.mjs", ["--apply"], env);
run("check-sentinelles.mjs", [], env);

for (const book of books) {
  if (!before.get(book).equals(fs.readFileSync(served(book)))) fail(`Le français de ${book} a changé pendant la préparation : relancer.`);
}
const backup = path.join(ARB, "lxx-fr-backups", path.basename(release));
for (const book of books) {
  const kept = path.join(backup, `${book}.${FRENCH}`);
  if (!fs.existsSync(kept)) install(before.get(book), kept);
}
const copied = greekFiles(SRC).filter((rel) => install(fs.readFileSync(path.join(SRC, rel)), path.join(LXX, rel))).length;
for (const book of books) install(fs.readFileSync(path.join(stage, book, FRENCH)), served(book));
console.log(`Grec : ${copied} fichiers mis à jour. Français régénéré : ${books.join(", ")}. Sauvegarde : ${backup}`);
