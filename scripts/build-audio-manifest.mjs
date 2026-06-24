// Liste les hash audio présents -> manifest.json (servi à AUDIO_BASE/manifest.json).
// Le frontend ne montre le bouton « écouter » que pour les formes présentes.
// Usage: node scripts/build-audio-manifest.mjs [dossier-audio]
//   défaut : public/audio  (en prod : passer /var/www/anaginosko/audio)
import { readdirSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dir = process.argv[2] || resolve(root, "public/audio");

if (!existsSync(dir)) {
  console.error(`Dossier introuvable : ${dir}`);
  process.exit(1);
}

const hashes = readdirSync(dir)
  .filter((f) => f.endsWith(".mp3"))
  .map((f) => f.slice(0, -4));

writeFileSync(resolve(dir, "manifest.json"), JSON.stringify(hashes));
console.log(`manifest.json : ${hashes.length} sons disponibles -> ${dir}`);
