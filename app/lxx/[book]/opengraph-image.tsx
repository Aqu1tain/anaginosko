import { bookOgImage } from "@/app/_og/bookImage";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Livre de la Septante en grec · Anaginosko";
export const dynamic = "force-dynamic";

export default async function Image({ params }: { params: Promise<{ book: string }> }) {
  const { book } = await params;
  return bookOgImage("lxx", book);
}
