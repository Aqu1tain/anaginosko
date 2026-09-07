import type { Metadata } from "next";
import ArticlesAdminView from "@/src/components/articles/ArticlesAdminView";

export const metadata: Metadata = { title: "Articles · Anaginosko", robots: { index: false, follow: false } };

export default function ArticlesAdminPage() {
  return <ArticlesAdminView />;
}
