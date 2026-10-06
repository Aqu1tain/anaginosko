import { CORPORA } from "@/src/data/corpus";
import { chapterMarkdown, markdownResponse } from "@/lib/markdown";
import { SITE } from "@/lib/seo";

// Servi sous /<corpus>/<livre>/<chapitre>.md (réécriture dans next.config.ts).
export const revalidate = 3600;
export const generateStaticParams = async () => [];

export async function GET(_: Request, { params }: { params: Promise<{ corpus: string; book: string; chapter: string }> }) {
  const { corpus: id, book, chapter } = await params;
  const corpus = CORPORA.find((c) => c.id === id);
  const body = corpus ? await chapterMarkdown(corpus, book, chapter) : null;
  return markdownResponse(body, `${SITE}${corpus?.routePrefix}/${book}/${chapter}`);
}
