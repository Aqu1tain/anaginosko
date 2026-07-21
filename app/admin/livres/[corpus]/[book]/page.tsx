import type { Metadata } from "next";
import BookIntroWorkbench from "@/src/components/admin/BookIntroWorkbench";

export const metadata: Metadata = {
  title: "Introduction de livre",
  robots: { index: false, follow: false },
};

export default async function BookIntroPage({ params }: { params: Promise<{ corpus: string; book: string }> }) {
  const { corpus, book } = await params;
  return <BookIntroWorkbench corpus={corpus} book={book} />;
}
