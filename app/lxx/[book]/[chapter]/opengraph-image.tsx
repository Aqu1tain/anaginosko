import { chapterOgImage } from "@/app/_og/chapterImage";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Passage de la Septante en grec · Anaginosko";
export const dynamic = "force-dynamic";

export default async function Image({ params }: { params: Promise<{ book: string; chapter: string }> }) {
  const { book, chapter } = await params;
  return chapterOgImage("lxx", book, chapter);
}
