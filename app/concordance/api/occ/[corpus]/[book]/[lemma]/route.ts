import { NextResponse } from "next/server";
import { CORPORA } from "@/src/data/corpus";
import { decodeParam, loadBookOccurrencesFs } from "@/lib/nt-server";

// Occurrences d'un lemme dans un livre, pour la répartition des mots fréquents.
// Mises en cache : les chapitres ne changent qu'au déploiement.
export const revalidate = 86400;
export const generateStaticParams = async () => [];

export async function GET(_: Request, { params }: { params: Promise<{ corpus: string; book: string; lemma: string }> }) {
  const { corpus: id, book, lemma } = await params;
  const corpus = CORPORA.find((c) => c.id === id);
  const l = decodeParam(lemma);
  const occ = corpus && l ? await loadBookOccurrencesFs(l, book, corpus).catch(() => null) : null;
  if (!occ) return NextResponse.json([], { status: 404 });
  return NextResponse.json(occ);
}
