import type { Metadata } from "next";
import Link from "next/link";
import {
  lemmaEntryFs,
  loadBooksFs,
  loadCollocationsFs,
  loadDistributionFs,
  loadOccurrencesFs,
} from "@/lib/nt-server";
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
  const l = decodeURIComponent(lemma);
  const entry = await lemmaEntryFs(l, LXX);
  const count = entry ? ` (${entry.count} occurrence${entry.count > 1 ? "s" : ""})` : "";
  return {
    title: `${l} · Concordance (Septante)`,
    description: `Concordance de ${l} ${LXX.locative}${count} : répartition par livre, définition (Bailly) et occurrences.`,
    alternates: { canonical: `/lxx/concordance/${lemma}` },
  };
}

export default async function LxxLemmaPage({ params }: { params: Promise<{ lemma: string }> }) {
  const { lemma } = await params;
  const l = decodeURIComponent(lemma);
  const entry = await lemmaEntryFs(l, LXX);

  if (!entry) {
    return (
      <div className="py-20 text-center text-base-content/70">
        <p className="font-greek text-xl">{l}</p>
        <p className="mt-2">Lemme introuvable.</p>
        <Link href="/lxx/concordance" className="link link-primary mt-3 inline-block">
          Toute la concordance
        </Link>
      </div>
    );
  }

  const [occ, dist, books, colloc, ntEntry] = await Promise.all([
    loadOccurrencesFs(entry.oid, LXX),
    loadDistributionFs(entry.oid, LXX),
    loadBooksFs(LXX),
    loadCollocationsFs(entry.oid, LXX),
    lemmaEntryFs(l, NT),
  ]);

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

  return <LemmaDetail entry={entry} occ={occ} dist={dist} books={books} colloc={colloc} corpus={LXX} cross={cross} />;
}
