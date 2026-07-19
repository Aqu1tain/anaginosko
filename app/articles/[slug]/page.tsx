import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedBySlug } from "@/lib/articles";
import { publicAuthor } from "@/lib/profiles";
import { CATEGORY_LABEL } from "@/src/components/articles/labels";
import ArticleRenderer from "@/src/components/articles/ArticleRenderer";
import Avatar from "@/src/components/profile/Avatar";

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

  // Règle : la signature vient du profil de l'auteur (nom d'affichage + photo).
  const author = publicAuthor(a.author.userId, a.author.name);
  const dateLabel = a.publishedAt
    ? new Date(a.publishedAt).toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" })
    : null;

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
        author: {
          "@type": "Person",
          name: author.name,
          ...(author.slug ? { url: `${SITE}/contributeurs/${author.slug}` } : {}),
        },
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
      <Link href="/articles" className="link text-sm text-base-content/60">← Articles</Link>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-primary/80">{CATEGORY_LABEL[a.category]}</p>
      <h1 className="mt-1 text-3xl font-bold leading-tight sm:text-4xl">{a.title}</h1>
      {a.excerpt && <p className="mt-3 max-w-prose text-lg leading-relaxed text-base-content/70">{a.excerpt}</p>}

      <div className="mt-5 flex items-center gap-3 border-y border-base-200 py-3">
        <Avatar name={author.name} photo={author.photo} size={44} />
        <div className="min-w-0">
          {author.slug ? (
            <Link href={`/contributeurs/${author.slug}`} className="font-medium hover:text-primary">
              {author.name}
            </Link>
          ) : (
            <span className="font-medium">{author.name}</span>
          )}
          {dateLabel && <p className="text-xs text-base-content/55">{dateLabel}</p>}
        </div>
      </div>

      {a.cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={a.cover} alt="" className="mt-6 w-full rounded-box" loading="lazy" decoding="async" />
      )}
      <div className="mt-6">
        <ArticleRenderer content={a.content} />
      </div>

      <footer className="mt-12 border-t border-base-200 pt-6">
        {author.slug ? (
          <Link
            href={`/contributeurs/${author.slug}`}
            className="group flex items-center gap-3 rounded-box border border-base-300 p-4 transition-colors hover:bg-base-200"
          >
            <Avatar name={author.name} photo={author.photo} size={52} />
            <div>
              <p className="font-semibold group-hover:text-primary">{author.name}</p>
              <p className="text-sm text-base-content/60">Voir le profil et les autres articles</p>
            </div>
          </Link>
        ) : (
          <Link href="/articles" className="link link-primary text-sm">Tous les articles</Link>
        )}
      </footer>
    </article>
  );
}
