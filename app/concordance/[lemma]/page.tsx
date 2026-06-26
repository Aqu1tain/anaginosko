import type { Metadata } from "next";
import Link from "next/link";
import {
  lemmaEntryFs,
  loadBooksFs,
  loadDistributionFs,
  loadOccurrencesFs,
} from "@/lib/nt-server";
import LemmaDetail from "@/src/components/LemmaDetail";

export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lemma: string }>;
}): Promise<Metadata> {
  const { lemma } = await params;
  const l = decodeURIComponent(lemma);
  const entry = await lemmaEntryFs(l);
  const count = entry ? ` (${entry.count} occurrence${entry.count > 1 ? "s" : ""})` : "";
  return {
    title: `${l} · Concordance`,
    description: `Concordance de ${l} dans le Nouveau Testament${count} : répartition par livre, définition (Bailly) et occurrences.`,
    alternates: { canonical: `/concordance/${lemma}` },
  };
}

export default async function LemmaPage({ params }: { params: Promise<{ lemma: string }> }) {
  const { lemma } = await params;
  const l = decodeURIComponent(lemma);
  const entry = await lemmaEntryFs(l);

  if (!entry) {
    return (
      <div className="py-20 text-center text-base-content/70">
        <p className="font-greek text-xl">{l}</p>
        <p className="mt-2">Lemme introuvable.</p>
        <Link href="/concordance" className="link link-primary mt-3 inline-block">
          Toute la concordance
        </Link>
      </div>
    );
  }

  const [occ, dist, books] = await Promise.all([
    loadOccurrencesFs(entry.oid),
    loadDistributionFs(entry.oid),
    loadBooksFs(),
  ]);

  return <LemmaDetail entry={entry} occ={occ} dist={dist} books={books} />;
}
