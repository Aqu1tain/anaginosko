// Additions grecques d'Esther (A-F). Rahlfs les étiquette en sous-versets
// (« 1:1a », « 4:17k ») ; on les sort en chapitres-lettres, versets numérotés dans
// l'ordre de Rahlfs. D reprend 5:1 et 5:2, que le grec réécrit entièrement : le
// chapitre 5 commence donc au verset 3. « 1:1s » est l'incipit hébreu, il reste 1:1.

const sub = (base, letters) => [...letters].map((l) => `${base}${l}`);

export const ESTHER_ADDITIONS = [
  { id: "A", title: "Le songe de Mardochée", units: sub("1:1", "abcdefghiklmnopqr") },
  { id: "B", title: "L’édit contre les Juifs", units: sub("3:13", "abcdefg"), readAfter: { chapter: 3, verse: 13 } },
  { id: "C", title: "Prières de Mardochée et d’Esther", units: sub("4:17", "abcdefghiklmnopqrstuwxyz") },
  { id: "D", title: "Esther devant le roi", units: ["5:1", ...sub("5:1", "abcdef"), "5:2", ...sub("5:2", "ab")], readAfter: { chapter: 5, verse: 0 } },
  { id: "E", title: "L’édit en faveur des Juifs", units: sub("8:12", "abcdefghiklmnopqrstux"), readAfter: { chapter: 8, verse: 12 } },
  { id: "F", title: "Le songe expliqué", units: sub("10:3", "abcdefghikl") },
];

export const ESTHER_CHAPTER_ORDER = ["A", 1, 2, 3, "B", 4, "C", "D", 5, 6, 7, 8, "E", 9, 10, "F"];

const HEBREW_INCIPIT = { label: "1:1s", chapter: 1, verse: 1 };

const targets = new Map([[HEBREW_INCIPIT.label, { chapter: HEBREW_INCIPIT.chapter, verse: HEBREW_INCIPIT.verse }]]);
for (const a of ESTHER_ADDITIONS) a.units.forEach((label, i) => targets.set(label, { chapter: a.id, verse: i + 1 }));

export const ESTHER_RAHLFS_LABELS = [...targets.keys()];

export const estherAddition = (id) => ESTHER_ADDITIONS.find((a) => a.id === id) ?? null;

export const isEstherAddition = (book, chapter) => book === "est" && estherAddition(chapter) !== null;

// Étiquette Rahlfs « 4:17k » -> { chapter: "C", verse: 10 } ; null hors additions.
export const estherTarget = (label) => targets.get(label) ?? null;

// { chapter: "C", verse: 10 } -> « 4:17k ».
export const rahlfsLabel = (chapter, verse) => estherAddition(chapter)?.units[verse - 1] ?? null;

// Additions qui se lisent au milieu d'un chapitre numéroté : verset -> addition.
export function estherReadAfter(chapter) {
  const out = new Map();
  for (const a of ESTHER_ADDITIONS) if (a.readAfter?.chapter === chapter) out.set(a.readAfter.verse, a);
  return out;
}
