import "server-only";
import {
  decodeParam,
  lemmaEntryFs,
  loadBooksFs,
  loadChapterFs,
  loadCollocationsFs,
  loadDistributionFs,
  loadGlossFs,
  loadOccurrencesFs,
} from "./nt-server";
import { fetchBaillyNotice } from "./bailly-server";
import { chapterVerses } from "./chapterVerses";
import { SITE, aiNote } from "./seo";
import { bookById, chapterNumbers } from "../src/data/nt";
import { NT, LXX, type CorpusConfig } from "../src/data/corpus";
import { lxxLemmaFor, ntLemmaFor } from "../src/data/lemmaEquivalences";
import { creditName } from "../src/data/translators";
import { romanize } from "../src/lib/romanize";

// Versions Markdown des chapitres et des fiches-lemme : le texte utile sans les
// centaines de Ko de balisage interactif, pour les assistants et les agents IA.

const MAX_OCCURRENCES = 300;
const MAX_NOTICE = 6000;

const SOURCES: Record<string, { greek: string; french: string }> = {
  nt: {
    greek: "SBL Greek New Testament (SBLGNT), CC BY 4.0 ; morphologie MorphGNT, CC BY-SA 3.0",
    french: "Sainte Bible néo-Crampon Libre (© 2022 Fraternité de Tibériade, CC BY-SA 4.0)",
  },
  lxx: {
    greek: "Septante, édition Rahlfs 1935 (LXX-Rahlfs-1935, Eliran Wong, CC BY-NC-SA 4.0)",
    french: "Pierre Giguet, 1872 (transcription Wikisource adaptée, CC BY-SA 4.0)",
  },
};

const chapterName = (corpus: CorpusConfig, book: string, ch: number) => {
  const name = corpus.bookNames[book] ?? book;
  return ch === 0 ? `${name}, prologue` : `${name} ${ch}`;
};

const plain = (html: string) =>
  html
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

export async function chapterMarkdown(corpus: CorpusConfig, book: string, chapter: string): Promise<string | null> {
  const ch = Number(chapter);
  const books = await loadBooksFs(corpus);
  const b = bookById(books, book);
  if (!b || !Number.isInteger(ch) || !chapterNumbers(b).includes(ch)) return null;

  const text = await loadChapterFs(book, ch, corpus);
  const { verses, frenchBlock } = chapterVerses(text, corpus);
  const label = chapterName(corpus, book, ch);
  const page = `${SITE}${corpus.routePrefix}/${book}/${ch}`;
  const house = new Set(Object.keys(text.maison ?? {}));
  const houseNames = [...new Set(Object.values(text.maison ?? {}).map(creditName))].join(", ");
  const allHouse = house.size > 0 && !frenchBlock && verses.every(({ v, fr }) => !fr || house.has(String(v)));
  const frenchCredit = allHouse
    ? `traduction ${houseNames}`
    : `${SOURCES[corpus.id].french}${house.size ? `, sauf les versets marqués « traduction ${houseNames} »` : ""}`;
  const nums = chapterNumbers(b);
  const i = nums.indexOf(ch);
  const neighbour = (n: number | undefined) => (n == null ? null : `[${chapterName(corpus, book, n)}](${SITE}${corpus.routePrefix}/${book}/${n}.md)`);

  const lines = [
    `# ${label} en grec et en français`,
    "",
    `> ${aiNote(page)}`,
    "",
    `${corpus.label}, ${chapterName(corpus, book, ch)}. Texte grec : ${SOURCES[corpus.id].greek}. Traduction française : ${frenchCredit}.`,
    "",
    `- Lecture interactive, avec l'analyse de chaque mot (lemme, morphologie, notice du Bailly) : ${page}`,
    `- Données mot à mot (JSON) : ${page}.json`,
    "",
    "## Texte",
    "",
  ];
  for (const { v, grec, fr } of verses) {
    lines.push(`**${v}** ${grec}`, "");
    if (fr) lines.push(`> ${fr}${house.has(String(v)) ? ` (traduction ${creditName(text.maison![String(v)])})` : ""}`, "");
  }
  if (frenchBlock) lines.push("## Traduction française", "", frenchBlock, "");
  const nav = [neighbour(nums[i - 1]), neighbour(nums[i + 1])].filter(Boolean);
  if (nav.length) lines.push(`Chapitres voisins : ${nav.join(" · ")}`, "");
  return lines.join("\n");
}

export async function lemmaMarkdown(corpus: CorpusConfig, lemma: string): Promise<string | null> {
  const l = decodeParam(lemma);
  const entry = l ? await lemmaEntryFs(l, corpus) : undefined;
  if (!l || !entry) return null;
  const other = corpus.id === "lxx" ? NT : LXX;
  const otherL = corpus.id === "lxx" ? ntLemmaFor(l) : lxxLemmaFor(l);

  const [occ, dist, books, colloc, lexicon, cross] = await Promise.all([
    loadOccurrencesFs(entry.oid, corpus),
    loadDistributionFs(entry.oid, corpus),
    loadBooksFs(corpus),
    loadCollocationsFs(entry.oid, corpus),
    loadGlossFs(l, corpus),
    lemmaEntryFs(otherL, other),
  ]);
  const notice = lexicon.gloss ? await fetchBaillyNotice(lexicon.gloss.uri) : null;
  const page = `${SITE}${corpus.concordanceBase}/${encodeURIComponent(l)}`;
  const bookName = (id: string) => corpus.bookNames[id] ?? id;

  const lines = [
    `# ${l} (${romanize(l)}) ${corpus.locative}`,
    "",
    `> ${aiNote(page)}`,
    "",
    `${entry.nature} · ${entry.count.toLocaleString("fr-FR")} occurrence${entry.count > 1 ? "s" : ""} ${corpus.locative} (${corpus.sourceLabel}).`,
  ];
  if (cross) {
    lines.push(
      `${cross.lemma} : ${cross.count.toLocaleString("fr-FR")} occurrence${cross.count > 1 ? "s" : ""} ${other.locative}, fiche ${SITE}${other.concordanceBase}/${encodeURIComponent(cross.lemma)}.md`,
    );
  }
  lines.push("", `Fiche interactive : ${page}`, "");

  if (notice || lexicon.gloss) {
    const full = notice ? notice.senses.map((s) => plain(s.html)).join("\n\n") : lexicon.gloss!.excerpt;
    const text = full.length > MAX_NOTICE ? `${full.slice(0, MAX_NOTICE)}…` : full;
    lines.push(
      `## Définition (Bailly${lexicon.via ? `, à la forme ${lexicon.via}` : ""})`,
      "",
      text,
      "",
      `Source : Bailly 2020 Hugo Chávez (G. Gréco et al.), CC BY-NC-ND 4.0, https://bailly.app/${encodeURIComponent(lexicon.gloss!.uri)}`,
      "",
    );
  }

  const order = new Map(books.map((b, i) => [b.id, i]));
  const byBook = Object.entries(dist)
    .filter(([, n]) => n > 0)
    .sort(([a], [b]) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
  if (byBook.length) {
    lines.push("## Répartition par livre", "", "| Livre | Occurrences |", "| --- | ---: |");
    for (const [b, n] of byBook) lines.push(`| ${bookName(b)} | ${n} |`);
    lines.push("");
  }

  if (colloc.length) {
    lines.push("## Cooccurrences fréquentes", "");
    for (const c of colloc.slice(0, 15)) lines.push(`- ${c.lemma} (${romanize(c.lemma)}), ${c.n} verset${c.n > 1 ? "s" : ""} en commun`);
    lines.push("");
  }

  lines.push("## Occurrences", "");
  for (const o of occ.slice(0, MAX_OCCURRENCES)) {
    lines.push(`- ${bookName(o.b)} ${o.c}, ${o.v} : ${o.f} (${SITE}${corpus.routePrefix}/${o.b}/${o.c}#v${o.v})`);
  }
  if (occ.length > MAX_OCCURRENCES) lines.push("", `Liste limitée aux ${MAX_OCCURRENCES} premières occurrences sur ${occ.length} ; la suite est sur la fiche interactive.`);
  lines.push("");
  return lines.join("\n");
}

export const markdownResponse = (body: string | null, canonical: string): Response =>
  body == null
    ? new Response("Introuvable.\n", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } })
    : new Response(body, {
        headers: { "content-type": "text/markdown; charset=utf-8", link: `<${canonical}>; rel="canonical"` },
      });
