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
import { ntLemmaFor } from "@/src/data/lemmaEquivalences";
import LemmaDetail from "@/src/components/LemmaDetail";
import { LXX, NT } from "@/src/data/corpus";

// Données LXX lues depuis LXX_DATA_DIR (prod : /var/www/anaginosko/lxx, servi par
// nginx). Rendu dynamique : ~14000 fiches, on ne les pré-rend pas.
export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lemma: string }>;
}): Promise<Metadata> {
  const { lemma } = await params;
  const l = decodeParam(lemma);
  const entry = l ? await lemmaEntryFs(l, LXX) : undefined;
  if (!l || !entry) return {};
  const count = ` (${entry.count} occurrence${entry.count > 1 ? "s" : ""})`;
  return {
    title: `${l} · Concordance (Septante)`,
    description: `Concordance de ${l} ${LXX.locative}${count} : répartition par livre, définition (Bailly) et occurrences.`,
    alternates: { canonical: `/lxx/concordance/${lemma}` },
  };
}

export default async function LxxLemmaPage({ params }: { params: Promise<{ lemma: string }> }) {
  const { lemma } = await params;
  const l = decodeParam(lemma);
  const entry = l ? await lemmaEntryFs(l, LXX) : undefined;
  if (!l || !entry) notFound();

  const [occ, dist, books, colloc, ntEntry, lexicon] = await Promise.all([
    loadOccurrencesFs(entry.oid, LXX),
    loadDistributionFs(entry.oid, LXX),
    loadBooksFs(LXX),
    loadCollocationsFs(entry.oid, LXX),
    lemmaEntryFs(ntLemmaFor(l), NT),
    loadGlossFs(l, LXX),
  ]);
  const notice = lexicon.gloss ? await fetchBaillyNotice(lexicon.gloss.uri) : null;

  // Vue croisee : si le lemme existe aussi dans le NT, on charge ses donnees pour
  // la bascule NT / LXX / Les deux (voir la vie du mot sur toute la Bible grecque).
  const cross = ntEntry
    ? await Promise.all([
        loadOccurrencesFs(ntEntry.oid, NT),
        loadDistributionFs(ntEntry.oid, NT),
        loadBooksFs(NT),
        loadCollocationsFs(ntEntry.oid, NT),
      ]).then(([o, d, b, c]) => ({ entry: ntEntry, occ: o, dist: d, books: b, colloc: c, corpus: NT }))
    : undefined;

  return <LemmaDetail entry={entry} occ={occ} dist={dist} books={books} colloc={colloc} corpus={LXX} cross={cross} lexicon={lexicon} notice={notice} />;
}
