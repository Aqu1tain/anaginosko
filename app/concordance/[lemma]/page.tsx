import type { Metadata } from "next";
import ConcordanceView from "@/src/components/ConcordanceView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lemma: string }>;
}): Promise<Metadata> {
  const { lemma } = await params;
  const l = decodeURIComponent(lemma);
  return {
    title: `${l} · Concordance`,
    description: `Concordance de ${l} dans le Nouveau Testament : définition (Bailly) et occurrences.`,
    alternates: { canonical: `/concordance/${lemma}` },
  };
}

export default async function LemmaPage({ params }: { params: Promise<{ lemma: string }> }) {
  const { lemma } = await params;
  return <ConcordanceView lemma={decodeURIComponent(lemma)} />;
}
