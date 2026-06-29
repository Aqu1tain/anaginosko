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
import { LXX } from "@/src/data/corpus";

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

  const [occ, dist, books, colloc] = await Promise.all([
    loadOccurrencesFs(entry.oid, LXX),
    loadDistributionFs(entry.oid, LXX),
    loadBooksFs(LXX),
    loadCollocationsFs(entry.oid, LXX),
  ]);

  return <LemmaDetail entry={entry} occ={occ} dist={dist} books={books} colloc={colloc} corpus={LXX} />;
}
