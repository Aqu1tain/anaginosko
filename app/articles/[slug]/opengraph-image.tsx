import { getPublishedBySlug } from "@/lib/articles";
import { publicAuthor } from "@/lib/profiles";
import { CATEGORY_LABEL } from "@/src/components/articles/labels";
import { articleCard } from "@/app/_og/cards";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Article · Anaginosko";
export const dynamic = "force-dynamic";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = getPublishedBySlug(slug);
  if (!a) return articleCard({ category: "Article", title: "Anaginosko", excerpt: "", author: null });
  const author = publicAuthor(a.author.userId, a.author.name);
  return articleCard({
    category: CATEGORY_LABEL[a.category] ?? "Article",
    title: a.title,
    excerpt: a.excerpt,
    author: author.name,
  });
}
