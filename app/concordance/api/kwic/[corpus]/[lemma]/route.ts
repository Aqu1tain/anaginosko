import { NextResponse } from "next/server";
import { NT, LXX } from "@/src/data/corpus";
import { decodeParam, lemmaEntryFs, loadDistributionFs } from "@/lib/nt-server";
import { kwic } from "@/lib/kwic";

// Occurrences en contexte, page par page : ?book=<id>&offset=<n>.
export async function GET(req: Request, { params }: { params: Promise<{ corpus: string; lemma: string }> }) {
  const { corpus: id, lemma } = await params;
  const corpus = [NT, LXX].find((c) => c.id === id);
  const l = decodeParam(lemma);
  const entry = corpus && l ? await lemmaEntryFs(l, corpus) : undefined;
  if (!corpus || !l || !entry) return NextResponse.json({ error: "Lemme introuvable." }, { status: 404 });

  const q = new URL(req.url).searchParams;
  const offset = Math.max(0, Math.min(100_000, Number(q.get("offset")) || 0));
  const book = q.get("book");
  const dist = await loadDistributionFs(entry.oid, corpus);
  const page = await kwic(l, corpus, dist, { book, offset });
  return NextResponse.json(page, { headers: { "Cache-Control": "public, max-age=3600" } });
}
