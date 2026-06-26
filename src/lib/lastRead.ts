// Dernier texte ouvert, mémorisé côté client pour « Reprendre la lecture »
// (accueil) et l'onglet « Lire » qui y renvoie.
export type LastRead = { href: string; label: string };

const KEY = "anaginosko:lastRead";

export function setLastRead(v: LastRead): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    /* localStorage indisponible (mode privé) */
  }
}

export function getLastRead(): LastRead | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LastRead) : null;
  } catch {
    return null;
  }
}
