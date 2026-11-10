import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const chapter = (book, ch) => JSON.parse(readFileSync(new URL(`../public/lxx/${book}/${ch}.json`, import.meta.url), "utf8")).mots;

// Lettres des sous-versets d'un verset, dans l'ordre du texte (null = le verset lui-même).
function subsOf(mots, verse) {
  const out = [];
  for (const m of mots) if (m.verse === verse && out.at(-1) !== (m.sub ?? null)) out.push(m.sub ?? null);
  return out;
}

test("un sous-verset lettré reste dans son verset et garde sa lettre", () => {
  assert.deepEqual(subsOf(chapter("1ki", 2), 35), [null, ..."abcdefghiklmno"]);
  assert.deepEqual(subsOf(chapter("job", 42), 17), [null, ..."abcde"]);
  assert.deepEqual(subsOf(chapter("pro", 9), 12), [null, "a", "b", "c"]);
});

test("un verset ordinaire n'a pas de lettre", () => {
  assert.deepEqual(subsOf(chapter("1ki", 2), 34), [null]);
  assert.ok(chapter("gen", 1).every((m) => m.sub === undefined));
});

test("les additions d'Esther sont des chapitres, sans lettre de sous-verset", () => {
  for (const ch of ["A", "C", "D", 1, 5]) assert.ok(chapter("est", ch).every((m) => m.sub === undefined));
});
