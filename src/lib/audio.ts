// Clé de fichier audio = hash FNV-1a de la translittération (même fonction côté
// build, voir scripts/build-audio.mjs). Les mp3 sont pré-générés dans public/audio.

export function audioKey(s: string): string {
  let h = 2166136261 >>> 0;
  const str = s.toLowerCase();
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

export const audioUrl = (translit: string): string =>
  `${import.meta.env.BASE_URL}audio/${audioKey(translit)}.mp3`;

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
