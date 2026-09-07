import { chapterOgImage } from "@/app/_og/chapterImage";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Passage en grec · Anaginosko";
// À la demande : ne pas pré-rendre une image par chapitre au build.
export const dynamic = "force-dynamic";

export default async function Image({ params }: { params: Promise<{ book: string; chapter: string }> }) {
  const { book, chapter } = await params;
  return chapterOgImage("nt", book, chapter);
}
