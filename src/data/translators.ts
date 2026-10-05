// Les données conservent une signature interne du traducteur. L'interface publie
// la signature éditoriale commune choisie par les auteurs. Les identifiants nommés
// sont reconnus sans imposer une migration du corpus vivant.
export const ANAGINOSKO_TRANSLATORS = new Set(["corentin-renard", "Admin", "Βιβλίον"]);

export const creditName = (by: string) => (ANAGINOSKO_TRANSLATORS.has(by) ? "Anaginosko" : by);
