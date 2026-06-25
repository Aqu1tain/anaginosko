// Génère l'audio de prononciation pour TOUT le NT via Azure Speech (IPA).
// érasmien -> voix fr-FR ; restituée -> voix el-GR. Sortie : public/audio/<hash>.mp3
// (déduplication par hash de contenu ; saute les fichiers déjà présents).
// Run: AZURE_SPEECH_KEY=… AZURE_SPEECH_REGION=francecentral node scripts/build-nt-audio.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { translitToIpa, hasErasmienDiphthong } from "./lib/translit-ipa.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ntDir = resolve(root, "public/nt");
const outDir = resolve(root, "public/audio");
// Réécrit les fichiers érasmiens contenant une diphtongue (leur IPA a changé).
const REGEN_DIPH = process.argv.includes("--regen-diphthongs");

const VOICE = { erasmien: "fr-FR-HenriNeural", restituee: "el-GR-NestorasNeural" };
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
const ssml = (system, ipa) =>
  `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${LANG[system]}"><voice name="${VOICE[system]}"><prosody rate="-8%"><phoneme alphabet="ipa" ph="${xmlEscape(ipa)}"></phoneme></prosody></voice></speak>`;

// Collecte les jobs distincts (par hash) à travers tout le NT.
const { books } = JSON.parse(readFileSync(resolve(ntDir, "books.json"), "utf8"));
const jobs = new Map(); // key -> { translit, system }
for (const b of books) {
  for (let c = 1; c <= b.chapters; c++) {
    const { mots } = JSON.parse(readFileSync(resolve(ntDir, b.id, `${c}.json`), "utf8"));
    for (const m of mots) {
      for (const [system, tr] of [["erasmien", m.erasmien], ["restituee", m.restituee]]) {
        const key = audioKey(tr);
        if (!jobs.has(key)) jobs.set(key, { translit: tr, system });
      }
    }
  }
}

mkdirSync(outDir, { recursive: true });
const KEY = process.env.AZURE_SPEECH_KEY;
const REGION = process.env.AZURE_SPEECH_REGION;
if (!KEY || !REGION) { console.error("AZURE_SPEECH_KEY et AZURE_SPEECH_REGION requis."); process.exit(1); }
const endpoint = `https://${REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let ok = 0, fail = 0, skip = 0, n = 0;
for (const [key, job] of jobs) {
  n++;
  const mp3 = resolve(outDir, `${key}.mp3`);
  const affected = job.system === "erasmien" && hasErasmienDiphthong(job.translit);
  // Régén ciblée : on ne (re)génère QUE les diphtongues érasmiennes. Mode
  // normal : on saute ce qui existe déjà.
  if (REGEN_DIPH ? !affected : existsSync(mp3)) { skip++; continue; }
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": KEY,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
        "User-Agent": "anaginosko",
      },
      body: ssml(job.system, translitToIpa(job.translit, job.system)),
    });
    if (res.status === 429) { await sleep(2000); n--; continue; } // throttle: réessaie
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    writeFileSync(mp3, Buffer.from(await res.arrayBuffer()));
    ok++;
  } catch (e) {
    fail++;
    if (fail <= 20) console.warn(`⚠ ${job.translit}: ${e.message}`);
  }
  if (n % 500 === 0) console.log(`… ${n}/${jobs.size} (${ok} générés, ${skip} déjà là, ${fail} échecs)`);
  await sleep(35);
}
console.log(`\nTerminé : ${ok} générés, ${skip} déjà présents, ${fail} échecs. Total formes : ${jobs.size}.`);
