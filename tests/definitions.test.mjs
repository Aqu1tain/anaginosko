import assert from "node:assert/strict";
import test from "node:test";
import {
  isHeadMatch,
  normHead,
  pickBestExcerpt,
  pickEntry,
} from "../scripts/lib/bailly-pick.mjs";

test("sélectionne uniquement la vedette exacte, accents et esprits compris", () => {
  const entries = [
    { word: "Η, η", uri: "Ê", excerpt: "la lettre êta", isExact: true },
    { word: "ἡ", uri: "article", excerpt: "article féminin", isExact: true },
    { word: "ἤ", uri: "ou", excerpt: "ou", isExact: true },
  ];
  assert.equal(pickEntry(entries, "ἤ")?.uri, "ou");
  assert.equal(pickEntry(entries, "οὔ"), null);
});

test("ne confond pas les homographes distingués par les diacritiques", () => {
  assert.equal(isHeadMatch({ word: "ἐλεός" }, "ἔλεος"), false);
  assert.equal(isHeadMatch({ word: "οὖ" }, "οὗ"), false);
  assert.equal(isHeadMatch({ word: "ἡμέρα" }, "ἡμέρα"), true);
  assert.equal(normHead("ἀπο·κρίνω"), normHead("ἀποκρίνω"));
});

test("préfère la notice substantielle d'une entrée-conteneur", () => {
  const entry = {
    word: "ἡμέρα",
    excerpt: "",
    children: [
      { word: "ἡμέρα", uri: "hêmera#1", excerpt: "ἡμέρα, fém. d’ ἥμερος." },
      { word: "ἡμέρα", uri: "hêmera#2", excerpt: "ἡμέρα, ας (ἡ) jour : période comprise entre deux nuits." },
    ],
  };
  assert.equal(pickBestExcerpt(entry, "ἡμέρα")?.uri, "hêmera#2");
});

test("ignore les enfants d'une autre vedette", () => {
  const entry = {
    word: "ἔλεος",
    excerpt: "",
    children: [
      { word: "ἐλεός", uri: "table", excerpt: "ἐλεός, table de cuisine." },
      { word: "ἔλεος", uri: "pity", excerpt: "ἔλεος, pitié, compassion." },
    ],
  };
  assert.equal(pickBestExcerpt(entry, "ἔλεος")?.uri, "pity");
});
