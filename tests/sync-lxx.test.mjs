import test from "node:test";
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repo = fileURLToPath(new URL("..", import.meta.url));
const json = (file) => JSON.parse(readFileSync(file, "utf8"));

// Corpus servi d'avant (Esther sans chapitres-lettres, Genèse) et grec neuf à copier.
function fixture(t, { conflict = false } = {}) {
  const root = mkdtempSync(join(tmpdir(), "anag-sync-lxx-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const [src, lxx, arb] = ["src", "lxx", "arb"].map((dir) => join(root, dir));

  cpSync(join(repo, "public/lxx/est"), join(src, "est"), { recursive: true });
  mkdirSync(join(src, "gen"));
  cpSync(join(repo, "public/lxx/gen/1.json"), join(src, "gen/1.json"));
  cpSync(join(repo, "public/lxx/books.json"), join(src, "books.json"));
  writeFileSync(join(src, "gen/fr.json"), '{"1":{"1":"à ne jamais copier"}}');

  const french = json(join(repo, "public/lxx/est/fr.json"));
  for (const ch of ["D", "E", "F"]) delete french[ch];
  french["5"]["1"] = "français d'avant";
  mkdirSync(join(lxx, "est"), { recursive: true });
  mkdirSync(join(lxx, "gen"));
  writeFileSync(join(lxx, "est/fr.json"), JSON.stringify(french));
  writeFileSync(join(lxx, "gen/fr.json"), '{"1":{"1":"intact"}}');

  const arbitration = json(join(repo, "data/lxx-arbitration.json"));
  if (conflict) arbitration.est["9:1"] = { sources: [[8, 13, 0, 10]], by: "test", at: "2026-01-01T00:00:00.000Z" };
  mkdirSync(arb);
  writeFileSync(join(arb, "lxx-arbitration.json"), JSON.stringify(arbitration));

  const run = (books) =>
    spawnSync(process.execPath, [join(repo, "scripts/sync-lxx.mjs"), books], {
      env: { ...process.env, LXX_GREEK_SRC: src, LXX_DATA_DIR: lxx, ARB_DIR: arb },
      encoding: "utf8",
    });
  return { lxx, arb, run, before: readFileSync(join(lxx, "est/fr.json"), "utf8") };
}

test("le grec est copié et le français du livre listé régénéré", (t) => {
  const { lxx, arb, run, before } = fixture(t);
  const r = run("est");
  assert.equal(r.status, 0, r.stderr);
  assert.ok(existsSync(join(lxx, "est/A.json")));
  assert.ok(existsSync(join(lxx, "gen/1.json")));
  assert.deepEqual(json(join(lxx, "books.json")), json(join(repo, "public/lxx/books.json")));
  const french = json(join(lxx, "est/fr.json"));
  assert.match(french.D["1"], /^Et le troisième jour/);
  assert.equal(french["5"]["1"], undefined);
  assert.equal(readFileSync(join(arb, "lxx-fr-backups", basename(repo), "est.fr.json"), "utf8"), before);
});

test("le français d'un livre non listé n'est jamais touché", (t) => {
  const { lxx, run } = fixture(t);
  assert.equal(run("est").status, 0);
  assert.equal(readFileSync(join(lxx, "gen/fr.json"), "utf8"), '{"1":{"1":"intact"}}');
});

test("une régénération refusée laisse le corpus servi intact", (t) => {
  const { lxx, run, before } = fixture(t, { conflict: true });
  const r = run("est");
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /corpus servi inchangé/);
  assert.ok(!existsSync(join(lxx, "est/A.json")));
  assert.ok(!existsSync(join(lxx, "books.json")));
  assert.equal(readFileSync(join(lxx, "est/fr.json"), "utf8"), before);
});

test("un livre invalide ou inconnu est refusé", (t) => {
  const { lxx, run } = fixture(t);
  for (const books of ["", "../etc", "zzz", "est,zzz"]) assert.equal(run(books).status, 1, books);
  assert.ok(!existsSync(join(lxx, "est/A.json")));
});

test("une seconde passe ne réécrit rien", (t) => {
  const { arb, run, before } = fixture(t);
  assert.equal(run("est").status, 0);
  const again = run("est");
  assert.equal(again.status, 0, again.stderr);
  assert.match(again.stdout, /Grec : 0 fichiers mis à jour/);
  assert.equal(readFileSync(join(arb, "lxx-fr-backups", basename(repo), "est.fr.json"), "utf8"), before);
});
