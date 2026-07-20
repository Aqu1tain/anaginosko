import type { Metadata } from "next";
import ArticleWorkbench from "@/src/components/articles/ArticleWorkbench";

export const metadata: Metadata = { title: "Édition · Anaginosko", robots: { index: false, follow: false } };

export default async function ArticleWorkbenchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ArticleWorkbench id={id} />;
}
