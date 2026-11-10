import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  ESTHER_ADDITIONS,
  ESTHER_CHAPTER_ORDER,
  estherAddition,
  estherReadAfter,
  estherTarget,
  isEstherAddition,
  rahlfsLabel,
} from "../lib/esther-additions.mjs";

const chapter = (ch) => JSON.parse(readFileSync(new URL(`../public/lxx/est/${ch}.json`, import.meta.url), "utf8"));
const verses = (ch) => [...new Set(chapter(ch).mots.map((m) => m.verse))];

test("les six additions ont l'effectif de Rahlfs", () => {
  const sizes = Object.fromEntries(ESTHER_ADDITIONS.map((a) => [a.id, a.units.length]));
  assert.deepEqual(sizes, { A: 17, B: 7, C: 24, D: 10, E: 21, F: 11 });
});

test("une étiquette Rahlfs mène à son chapitre-lettre et en revient", () => {
  assert.deepEqual(estherTarget("4:17k"), { chapter: "C", verse: 10 });
  assert.equal(rahlfsLabel("C", 10), "4:17k");
  for (const a of ESTHER_ADDITIONS)
    a.units.forEach((label, i) => {
      assert.deepEqual(estherTarget(label), { chapter: a.id, verse: i + 1 });
      assert.equal(rahlfsLabel(a.id, i + 1), label);
    });
});

test("l'incipit hébreu reste Esther 1:1", () => {
  assert.deepEqual(estherTarget("1:1s"), { chapter: 1, verse: 1 });
  assert.ok(chapter(1).mots.some((m) => m.verse === 1 && m.grec === "ἐκράτησεν"));
  assert.ok(!chapter("A").mots.some((m) => m.grec === "ἐκράτησεν"));
});

test("un verset ordinaire n'est pas une addition", () => {
  assert.equal(estherTarget("2:5"), null);
  assert.equal(estherAddition(3), null);
  assert.equal(isEstherAddition("est", "B"), true);
  assert.equal(isEstherAddition("gen", "B"), false);
});

test("B, D et E se lisent au milieu des chapitres 3, 5 et 8", () => {
  assert.equal(estherReadAfter(3).get(13).id, "B");
  assert.equal(estherReadAfter(5).get(0).id, "D");
  assert.equal(estherReadAfter(8).get(12).id, "E");
  assert.equal(estherReadAfter(2).size, 0);
});

test("le corpus généré suit la table", () => {
  const books = JSON.parse(readFileSync(new URL("../public/lxx/books.json", import.meta.url), "utf8")).books;
  const est = books.find((b) => b.id === "est");
  assert.deepEqual(est.chapterList, ESTHER_CHAPTER_ORDER);
  assert.equal(est.words, 5843);
  for (const a of ESTHER_ADDITIONS) {
    assert.deepEqual(verses(a.id), a.units.map((_, i) => i + 1));
    assert.deepEqual(Object.values(chapter(a.id).labels), a.units);
  }
  assert.deepEqual(verses(5).slice(0, 2), [3, 4]);
  assert.equal(chapter(3).mots.filter((m) => m.verse === 13).length, 26);
});
