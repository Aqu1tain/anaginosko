// Génère les fichiers audio de prononciation ÉRASMIENNE des mots, au build,
// avec espeak-ng (voix française : la translittération érasmienne est faite pour
// être lue par un francophone). Sortie : public/audio/<hash>.mp3.
// Prérequis : espeak-ng et ffmpeg. Run: node scripts/build-audio.mjs
import { execFileSync } from "node:child_process";
import { readFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { tmpdir } from "node:os";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(root, "public/audio");

function audioKey(s) {
  let h = 2166136261 >>> 0;
  const str = s.toLowerCase();
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

const data = JSON.parse(readFileSync(resolve(root, "src/data/texts.json"), "utf8"));
const words = [
  ...new Set(
    data.texts.flatMap((t) => (t.mots ?? []).map((m) => m.erasmien.toLowerCase())).filter(Boolean),
  ),
];

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const tmp = resolve(tmpdir(), "anaginosko-tts.wav");
let ok = 0;
let fail = 0;

for (let i = 0; i < words.length; i++) {
  const w = words[i];
  const mp3 = resolve(outDir, `${audioKey(w)}.mp3`);
  if (existsSync(mp3)) continue; // déduplication par hash
  try {
    execFileSync("espeak-ng", ["-v", "fr", "-s", "150", w, "-w", tmp], { stdio: "ignore" });
    execFileSync(
      "ffmpeg",
      ["-y", "-i", tmp, "-ac", "1", "-ar", "22050", "-codec:a", "libmp3lame", "-q:a", "7", mp3],
      { stdio: "ignore" },
    );
    ok++;
  } catch (e) {
    fail++;
    console.warn(`⚠ ${w}: ${e.message}`);
  }
  if (i % 100 === 0) console.log(`… ${i}/${words.length} (${ok} ok, ${fail} échecs)`);
}

console.log(`\n${ok} fichiers audio écrits dans public/audio (${fail} échecs).`);
