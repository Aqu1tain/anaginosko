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

// Rendu serveur à la demande. Les données NT sont lues depuis NT_DATA_DIR (en
// prod : le dossier servi par nginx, /var/www/anaginosko/nt), car elles ne sont
// pas embarquées dans le standalone Next. Pré-rendre les 5461 fiches gonflerait
// le bundle de centaines de Mo ; on garde donc le rendu dynamique.
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

  const [occ, dist, books, colloc] = await Promise.all([
    loadOccurrencesFs(entry.oid),
    loadDistributionFs(entry.oid),
    loadBooksFs(),
    loadCollocationsFs(entry.oid),
  ]);

  return <LemmaDetail entry={entry} occ={occ} dist={dist} books={books} colloc={colloc} />;
}
