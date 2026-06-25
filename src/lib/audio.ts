// Prononciation : fichiers mp3 pré-générés au build via Azure Speech (voix
// neuronales pilotées en IPA). érasmien -> voix fr-FR, restituée -> voix el-GR
// (qui produit θ/x/v). La clé de fichier = hash FNV-1a de la translittération
// (même fonction côté build, voir scripts/build-audio-azure.mjs).

export function audioKey(s: string): string {
  let h = 2166136261 >>> 0;
  const str = s.toLowerCase();
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

// Base des fichiers audio : en prod ils sont sur Cloudflare R2
// (VITE_AUDIO_BASE, ex. https://audio.anaginosko.fr/) ; en local, public/audio/.
const AUDIO_BASE = process.env.NEXT_PUBLIC_AUDIO_BASE ?? "/audio/";

export const audioUrl = (translit: string): string =>
  `${AUDIO_BASE}${audioKey(translit)}.mp3`;

// Manifeste des sons disponibles (hash présents côté serveur). Chargé une fois ;
// si absent (404), on considère qu'aucun son n'est disponible. Permet de masquer
// le bouton « écouter » tant que l'audio n'est pas généré.
let manifestPromise: Promise<Set<string>> | null = null;

export function loadAudioManifest(): Promise<Set<string>> {
  if (!manifestPromise) {
    manifestPromise = fetch(`${AUDIO_BASE}manifest.json`)
      .then((r) => (r.ok ? r.json() : []))
      .then((arr: string[]) => new Set(arr))
      .catch(() => new Set<string>());
  }
  return manifestPromise;
}

let current: HTMLAudioElement | null = null;

export function playTranslit(translit: string): void {
  try {
    current?.pause();
  } catch {
    /* ignore */
  }
  const a = new Audio(audioUrl(translit));
  current = a;
  a.play().catch(() => {
    /* fichier absent ou lecture bloquée */
  });
}
