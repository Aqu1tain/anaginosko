import { CORPORA } from "@/src/data/corpus";
import { lemmaMarkdown, markdownResponse } from "@/lib/markdown";
import { SITE } from "@/lib/seo";
import { decodeParam } from "@/lib/nt-server";

// Servi sous /concordance/<lemme>.md et /lxx/concordance/<lemme>.md (réécriture
// dans next.config.ts).
export const revalidate = 86400;
export const generateStaticParams = async () => [];

export async function GET(_: Request, { params }: { params: Promise<{ corpus: string; lemma: string }> }) {
  const { corpus: id, lemma } = await params;
  const corpus = CORPORA.find((c) => c.id === id);
  const body = corpus ? await lemmaMarkdown(corpus, lemma) : null;
  return markdownResponse(body, `${SITE}${corpus?.concordanceBase}/${encodeURIComponent(decodeParam(lemma) ?? lemma)}`);
}
