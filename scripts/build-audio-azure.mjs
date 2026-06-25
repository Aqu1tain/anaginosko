// Génère l'audio de prononciation via Azure Speech (voix neuronales + IPA).
// - érasmien  -> voix fr-FR (phonologie « scolaire » française)
// - restituée -> voix el-GR (produit nativement θ/x/v de la koinè)
// On fournit l'IPA en SSML <phoneme alphabet="ipa">, donc le son est EXACT.
//
// Dry-run (sans clé) : node scripts/build-audio-azure.mjs --dry
// Génération : AZURE_SPEECH_KEY=… AZURE_SPEECH_REGION=westeurope node scripts/build-audio-azure.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { translitToIpa, hasErasmienDiphthong } from "./lib/translit-ipa.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DRY = process.argv.includes("--dry");
// Réécrit les fichiers érasmiens contenant une diphtongue (leur IPA a changé).
const REGEN_DIPH = process.argv.includes("--regen-diphthongs");

const VOICE = {
  erasmien: "fr-FR-HenriNeural",
  restituee: "el-GR-NestorasNeural",
};
const LANG = { erasmien: "fr-FR", restituee: "el-GR" };

function audioKey(s) {
  let h = 2166136261 >>> 0;
  const str = s.toLowerCase();
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

const xmlEscape = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function ssml(system, ipa) {
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${LANG[system]}"><voice name="${VOICE[system]}"><prosody rate="-8%"><phoneme alphabet="ipa" ph="${xmlEscape(ipa)}"></phoneme></prosody></voice></speak>`;
}

// Collecte les translittérations distinctes par système.
const data = JSON.parse(readFileSync(resolve(root, "src/data/texts.json"), "utf8"));
const jobs = new Map(); // key -> { translit, system, ipa }
for (const t of data.texts) {
  for (const m of t.mots ?? []) {
    for (const [system, tr] of [["erasmien", m.erasmien], ["restituee", m.restituee]]) {
      if (!tr) continue;
      const key = audioKey(tr);
      if (!jobs.has(key)) jobs.set(key, { translit: tr, system, ipa: translitToIpa(tr, system) });
    }
  }
}

if (DRY) {
  const samples = ["euangElio", "pneUma", "aiÔnios", "oikÍa", "autOs", "eithÊ", "lOgos", "khristOu"];
  console.log("=== échantillons translittération érasmienne -> IPA ===");
  for (const w of samples) console.log(w.padEnd(12), "->", translitToIpa(w, "erasmien"));
  console.log(`\n${jobs.size} fichiers à générer (érasmien + restituée distincts).`);
  console.log("Lance avec AZURE_SPEECH_KEY et AZURE_SPEECH_REGION pour générer.");
  process.exit(0);
}

const KEY = process.env.AZURE_SPEECH_KEY;
const REGION = process.env.AZURE_SPEECH_REGION;
if (!KEY || !REGION) {
  console.error("AZURE_SPEECH_KEY et AZURE_SPEECH_REGION requis (ou --dry).");
  process.exit(1);
}

const outDir = resolve(root, "public/audio");
mkdirSync(outDir, { recursive: true });
const endpoint = `https://${REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let ok = 0;
let fail = 0;
let n = 0;
for (const [key, job] of jobs) {
  n++;
  const mp3 = resolve(outDir, `${key}.mp3`);
  const affected = job.system === "erasmien" && hasErasmienDiphthong(job.translit);
  // Régén ciblée : on ne (re)génère QUE les diphtongues érasmiennes.
  if (REGEN_DIPH ? !affected : existsSync(mp3)) continue;
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": KEY,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
        "User-Agent": "anaginosko",
      },
      body: ssml(job.system, job.ipa),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${await res.text()}`);
    writeFileSync(mp3, Buffer.from(await res.arrayBuffer()));
    ok++;
  } catch (e) {
    fail++;
    console.warn(`⚠ ${job.translit} [${job.system}] ${job.ipa}: ${e.message}`);
  }
  if (n % 100 === 0) console.log(`… ${n}/${jobs.size} (${ok} ok, ${fail} échecs)`);
  await sleep(40);
}
console.log(`\n${ok} fichiers écrits dans public/audio (${fail} échecs).`);
