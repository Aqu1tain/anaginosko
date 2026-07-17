import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProfileBySlug } from "@/lib/profiles";
import { listPublished } from "@/lib/articles";
import { CATEGORY_LABEL } from "@/src/components/articles/labels";

export const dynamic = "force-dynamic";

const SITE = "https://anaginosko.fr";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = getProfileBySlug(slug);
  if (!p) return { title: "Profil introuvable", robots: { index: false, follow: false } };
  return {
    title: p.displayName,
    description: p.bio ? p.bio.slice(0, 200) : `Profil de ${p.displayName} sur Anaginosko.`,
    alternates: { canonical: `/contributeurs/${p.slug}` },
  };
}

export default async function ContributorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = getProfileBySlug(slug);
  if (!p) notFound();

  const articles = listPublished().filter((a) => a.author.userId === p.userId);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: {
      "@type": "Person",
      name: p.displayName,
      ...(p.bio ? { description: p.bio } : {}),
      ...(p.photo ? { image: `${SITE}${p.photo}` } : {}),
      ...(p.links.length ? { sameAs: p.links.map((l) => l.url) } : {}),
      url: `${SITE}/contributeurs/${p.slug}`,
    },
  };

  return (
    <div className="mx-auto max-w-2xl pb-16 pt-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="flex flex-col items-center text-center">
        <div className="h-28 w-28 overflow-hidden rounded-full bg-base-300">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {p.photo && <img src={p.photo} alt={p.displayName} className="h-full w-full object-cover" />}
        </div>
        <h1 className="mt-4 text-3xl font-bold">{p.displayName}</h1>
        {p.bio && <p className="mt-3 max-w-prose whitespace-pre-wrap text-base-content/80">{p.bio}</p>}
        {p.links.length > 0 && (
          <ul className="mt-4 flex flex-wrap justify-center gap-2">
            {p.links.map((l, i) => (
              <li key={i}>
                <a href={l.url} target="_blank" rel="noopener noreferrer nofollow" className="btn btn-outline btn-sm">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        )}
      </header>

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-base-content/60">
          Articles{articles.length > 0 ? ` (${articles.length})` : ""}
        </h2>
        {articles.length === 0 ? (
          <p className="mt-3 text-base-content/60">Aucun article publié pour le moment.</p>
        ) : (
          <ul className="mt-3 space-y-4">
            {articles.map((a) => (
              <li key={a.id}>
                <Link href={`/articles/${a.slug}`} className="group block rounded-box border border-base-300 p-4 transition-colors hover:bg-base-200">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="badge badge-outline badge-sm">{CATEGORY_LABEL[a.category]}</span>
                    {a.publishedAt && (
                      <time className="text-base-content/50">{new Date(a.publishedAt).toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" })}</time>
                    )}
                  </div>
                  <h3 className="mt-1 text-lg font-semibold group-hover:text-primary">{a.title}</h3>
                  {a.excerpt && <p className="mt-1 line-clamp-2 text-sm text-base-content/75">{a.excerpt}</p>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
