import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  decodeParam,
  lemmaEntryFs,
  loadBooksFs,
  loadCollocationsFs,
  loadDistributionFs,
  loadGlossFs,
  loadOccurrencesFs,
} from "@/lib/nt-server";
import { fetchBaillyNotice } from "@/lib/bailly-server";
import { lxxLemmaFor, ntLemmaFor } from "@/src/data/lemmaEquivalences";
import LemmaDetail from "@/src/components/LemmaDetail";
import JsonLd from "@/app/_components/JsonLd";
import { NT, LXX, type CorpusConfig } from "@/src/data/corpus";
import type { LemmaEntry } from "@/src/data/nt";
import { SITE, pageMetadata } from "@/lib/seo";
import { romanize } from "@/src/lib/romanize";

// Fiche-lemme partagée entre corpus. L'autre corpus fournit la vue croisée : la vie
// du mot sur toute la Bible grecque.
const otherCorpus = (corpus: CorpusConfig) => (corpus.id === "lxx" ? NT : LXX);
const otherLemma = (corpus: CorpusConfig, lemma: string) => (corpus.id === "lxx" ? ntLemmaFor(lemma) : lxxLemmaFor(lemma));
const occurrences = (n: number) => `${n.toLocaleString("fr-FR")} occurrence${n > 1 ? "s" : ""}`;

async function resolve(corpus: CorpusConfig, lemma: string) {
  const l = decodeParam(lemma);
  const entry = l ? await lemmaEntryFs(l, corpus) : undefined;
  if (!l || !entry) return null;
  const cross = await lemmaEntryFs(otherLemma(corpus, l), otherCorpus(corpus));
  return { l, entry, cross };
}

const describe = (corpus: CorpusConfig, l: string, entry: LemmaEntry, cross?: LemmaEntry) =>
  `${l} (${romanize(l)}), ${entry.nature.toLowerCase()} : ${occurrences(entry.count)} ${corpus.locative}` +
  (cross ? ` et ${occurrences(cross.count)} ${otherCorpus(corpus).locative}` : "") +
  ". Notice du Bailly, répartition par livre, cooccurrences et chaque occurrence en contexte.";

export async function lemmaMetadata(corpus: CorpusConfig, params: Promise<{ lemma: string }>): Promise<Metadata> {
  const { lemma } = await params;
  const found = await resolve(corpus, lemma);
  if (!found) return {};
  const { l, entry, cross } = found;
  const path = `${corpus.concordanceBase}/${lemma}`;
  return pageMetadata({
    title: `${l} (${romanize(l)}) ${corpus.locative}`,
    description: describe(corpus, l, entry, cross),
    path,
    markdown: `${path}.md`,
  });
}

export async function LemmaScreen({ corpus, params }: { corpus: CorpusConfig; params: Promise<{ lemma: string }> }) {
  const { lemma } = await params;
  const found = await resolve(corpus, lemma);
  if (!found) notFound();
  const { l, entry, cross: crossEntry } = found;
  const other = otherCorpus(corpus);

  const [occ, dist, books, colloc, lexicon] = await Promise.all([
    loadOccurrencesFs(entry.oid, corpus),
    loadDistributionFs(entry.oid, corpus),
    loadBooksFs(corpus),
    loadCollocationsFs(entry.oid, corpus),
    loadGlossFs(l, corpus),
  ]);
  const notice = lexicon.gloss ? await fetchBaillyNotice(lexicon.gloss.uri) : null;

  const cross = crossEntry
    ? await Promise.all([
        loadOccurrencesFs(crossEntry.oid, other),
        loadDistributionFs(crossEntry.oid, other),
        loadBooksFs(other),
        loadCollocationsFs(crossEntry.oid, other),
      ]).then(([o, d, b, c]) => ({ entry: crossEntry, occ: o, dist: d, books: b, colloc: c, corpus: other }))
    : undefined;

  const url = `${SITE}${corpus.concordanceBase}/${lemma}`;
  const definedTerm = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: l,
    alternateName: romanize(l),
    inLanguage: "grc",
    url,
    description: lexicon.gloss?.excerpt ?? describe(corpus, l, entry, crossEntry),
    ...(lexicon.gloss ? { sameAs: `https://bailly.app/${encodeURIComponent(lexicon.gloss.uri)}` } : {}),
    encoding: { "@type": "MediaObject", encodingFormat: "text/markdown", contentUrl: `${url}.md` },
    inDefinedTermSet: {
      "@type": "DefinedTermSet",
      name: `Concordance ${corpus.genitive}`,
      url: `${SITE}${corpus.concordanceBase}`,
    },
  };

  return (
    <>
      <JsonLd data={definedTerm} />
      <LemmaDetail entry={entry} occ={occ} dist={dist} books={books} colloc={colloc} corpus={corpus} cross={cross} lexicon={lexicon} notice={notice} />
    </>
  );
}
