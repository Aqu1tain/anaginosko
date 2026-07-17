import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedBySlug } from "@/lib/articles";
import { getProfileByUserId } from "@/lib/profiles";
import { byline } from "@/src/components/articles/labels";
import ArticleRenderer from "@/src/components/articles/ArticleRenderer";

export const dynamic = "force-dynamic";

const SITE = "https://anaginosko.fr";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const a = getPublishedBySlug(slug);
  if (!a) return { title: "Article introuvable", robots: { index: false, follow: false } };
  return {
    title: a.title,
    description: a.excerpt || undefined,
    alternates: { canonical: `/articles/${a.slug}` },
    openGraph: {
      type: "article",
      title: a.title,
      description: a.excerpt || undefined,
      ...(a.cover ? { images: [`${SITE}${a.cover}`] } : {}),
    },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = getPublishedBySlug(slug);
  if (!a) notFound();

  // Signature liée au profil seulement si l'auteur signe de son nom (pas « Βιβλίον »).
  const authorProfile = a.signature === "author" ? getProfileByUserId(a.author.userId) : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Accueil", item: `${SITE}/` },
          { "@type": "ListItem", position: 2, name: "Articles", item: `${SITE}/articles` },
          { "@type": "ListItem", position: 3, name: a.title, item: `${SITE}/articles/${a.slug}` },
        ],
      },
      {
        "@type": "Article",
        headline: a.title,
        ...(a.excerpt ? { description: a.excerpt } : {}),
        datePublished: a.publishedAt,
        dateModified: a.updatedAt,
        author: { "@type": "Person", name: byline(a) },
        publisher: { "@type": "Organization", name: "Anaginosko", url: SITE },
        inLanguage: "fr",
        mainEntityOfPage: `${SITE}/articles/${a.slug}`,
        ...(a.cover ? { image: `${SITE}${a.cover}` } : {}),
      },
    ],
  };

  return (
    <article className="mx-auto max-w-3xl pb-20 pt-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <a href="/articles" className="link text-sm text-base-content/60">← Articles</a>
      <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">{a.title}</h1>
      <p className="mt-3 text-sm text-base-content/60">
        {authorProfile ? (
          <a href={`/contributeurs/${authorProfile.slug}`} className="link link-hover font-medium">{byline(a)}</a>
        ) : (
          byline(a)
        )}
        {a.publishedAt && (
          <>
            {" · "}
            <time>{new Date(a.publishedAt).toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" })}</time>
          </>
        )}
      </p>
      {a.cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={a.cover} alt="" className="mt-5 w-full rounded-box" loading="lazy" decoding="async" />
      )}
      <div className="mt-6">
        <ArticleRenderer content={a.content} />
      </div>
    </article>
  );
}
