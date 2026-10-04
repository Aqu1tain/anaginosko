// Fusion à trois de l'arbitrage (scripts/merge-arb-git-server.mjs) : la base --prev
// dit quel côté a bougé ; seul un changement des deux côtés reste un conflit.
//   node tests/merge-arb-git-server.test.mjs
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const script = path.join(path.dirname(new URL(import.meta.url).pathname), "../scripts/merge-arb-git-server.mjs");
const maison = (text) => ({ sources: [], maison: text, by: "Admin", at: "2026-07-09T00:00:00Z" });

function merge({ git, server, prev }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "arb-merge-"));
  const file = (name, data) => { const f = path.join(dir, name); fs.writeFileSync(f, JSON.stringify(data)); return f; };
  const args = [script, "--git", file("git.json", git), "--server", file("server.json", server), "--out", path.join(dir, "out.json"), "--capture", path.join(dir, "fresh.json")];
  if (prev) args.push("--prev", file("prev.json", prev));
  const run = spawnSync(process.execPath, args, { encoding: "utf8" });
  const read = (name) => fs.existsSync(path.join(dir, name)) ? JSON.parse(fs.readFileSync(path.join(dir, name), "utf8")) : null;
  return { status: run.status, out: read("out.json"), fresh: read("fresh.json") };
}

const base = { gen: { "1:7": maison("ancien") } };
const cases = [
  ["serveur inchangé, git a évolué : git l'emporte",
    merge({ git: { gen: { "1:7": maison("git") } }, server: base, prev: base }),
    (r) => r.status === 0 && r.out.gen["1:7"].maison === "git" && r.fresh.length === 0],
  ["git inchangé, serveur retravaillé : serveur conservé et capturé",
    merge({ git: base, server: { gen: { "1:7": maison("serveur") } }, prev: base }),
    (r) => r.status === 0 && r.out.gen["1:7"].maison === "serveur" && r.fresh.length === 1],
  ["les deux ont changé : conflit bloquant",
    merge({ git: { gen: { "1:7": maison("git") } }, server: { gen: { "1:7": maison("serveur") } }, prev: base }),
    (r) => r.status === 1 && r.out === null],
  ["sans base : conflit bloquant",
    merge({ git: { gen: { "1:7": maison("git") } }, server: base }),
    (r) => r.status === 1 && r.out === null],
];

let fail = 0;
for (const [name, result, ok] of cases) if (!ok(result)) { console.error(`ECHEC: ${name}`); fail++; }
if (fail) { console.error(`\n${fail} échec(s).`); process.exit(1); }
console.log(`OK : ${cases.length} cas de fusion à trois validés.`);
