// Capture quotidienne (scripts/capture-prod-arbitration.mjs) : la prod l'emporte, rien
// de git n'est perdu, une entrée archivée par git ne revient pas.
//   node tests/capture-prod-arbitration.test.mjs
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const script = path.join(path.dirname(new URL(import.meta.url).pathname), "../scripts/capture-prod-arbitration.mjs");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "capture-"));
const data = path.join(dir, "data"), prod = path.join(dir, "prod");
fs.mkdirSync(data); fs.mkdirSync(prod);
const put = (folder, name, value) => fs.writeFileSync(path.join(folder, name), JSON.stringify(value));
const entry = (maison) => ({ sources: [], maison, by: "Βιβλίον", at: "2026-10-04T00:00:00Z" });

put(data, "lxx-arbitration.json", { _archived: { gen: { "1:3": {} } }, gen: { "1:1": entry("git"), "1:2": entry("git seul") } });
put(prod, "lxx-arbitration.json", { gen: { "1:1": entry("prod"), "1:3": entry("archivé"), "1:4": entry("nouveau") } });
put(prod, "lxx-biblion-validated.json", [{ book: "gen", ref: "1:5", by: "Βιβλίον", at: "x" }]);
put(prod, "nt-maison.json", { translations: { mt: { "17:15": { maison: "Seigneur", by: "Βιβλίον", at: "x" } } } });

const run = spawnSync(process.execPath, [script, prod], { env: { ...process.env, CAPTURE_DATA_DIR: data }, encoding: "utf8" });
const read = (name) => JSON.parse(fs.readFileSync(path.join(data, name), "utf8"));
const arb = read("lxx-arbitration.json");
const checks = [
  ["le script réussit", run.status === 0],
  ["la prod l'emporte", arb.gen["1:1"].maison === "prod"],
  ["une entrée de git seul est gardée", arb.gen["1:2"].maison === "git seul"],
  ["une entrée archivée par git ne revient pas", arb.gen["1:3"] === undefined],
  ["une entrée nouvelle de la prod est ajoutée", arb.gen["1:4"].maison === "nouveau"],
  ["les validations sont copiées", read("lxx-biblion-validated.json")[0].ref === "1:5"],
  ["les traductions NT sont copiées", read("nt-maison.json").mt["17:15"].maison === "Seigneur"],
];
const failed = checks.filter(([, ok]) => !ok);
for (const [name] of failed) console.error(`ECHEC: ${name}`);
if (failed.length) process.exit(1);
console.log(`OK : ${checks.length} contrôles de capture.`);
