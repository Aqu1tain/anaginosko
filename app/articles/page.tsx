import type { Metadata } from "next";
import Link from "next/link";
import { listPublished, type ArticleSummary } from "@/lib/articles";
import { publicAuthor, type PublicAuthor } from "@/lib/profiles";
import { CATEGORY_LABEL } from "@/src/components/articles/labels";
import Avatar from "@/src/components/profile/Avatar";
import BreadcrumbJsonLd from "@/app/_components/BreadcrumbJsonLd";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Articles",
  description: "Articles et publications d'Anaginosko sur le grec de la Bible et la vie du projet.",
  alternates: { canonical: "/articles" },
};

const TABS: { key: "" | "site" | "philologie"; label: string; href: string }[] = [
  { key: "", label: "Tous", href: "/articles" },
  { key: "philologie", label: "Philologie", href: "/articles?categorie=philologie" },
  { key: "site", label: "Vie du site", href: "/articles?categorie=site" },
];

const dateLabel = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" }) : null;

function AuthorLine({ author, date }: { author: PublicAuthor; date: string | null }) {
  return (
    <span className="flex items-center gap-2 text-sm text-base-content/60">
      <Avatar name={author.name} photo={author.photo} size={26} />
      <span className="min-w-0 truncate">
        {author.name}
        {date && <span className="text-base-content/45"> · {date}</span>}
      </span>
    </span>
  );
}

function FeaturedCard({ a, author }: { a: ArticleSummary; author: PublicAuthor }) {
  return (
    <Link
      href={`/articles/${a.slug}`}
      className="group grid overflow-hidden rounded-box border border-base-300 bg-base-100 shadow-sm transition-all hover:border-base-content/20 hover:shadow-md sm:grid-cols-2"
    >
      {a.cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={a.cover} alt="" className="h-48 w-full object-cover sm:h-full" loading="lazy" />
      ) : (
        <div className="flex h-48 items-center justify-center bg-primary/5 sm:h-full">
          <span className="font-greek text-6xl text-primary/25">Α</span>
        </div>
      )}
      <div className="flex flex-col justify-center p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary/80">{CATEGORY_LABEL[a.category]}</p>
        <h2 className="mt-1.5 text-2xl font-bold leading-snug group-hover:text-primary">{a.title}</h2>
        {a.excerpt && <p className="mt-2 line-clamp-3 text-base-content/70">{a.excerpt}</p>}
        <div className="mt-4">
          <AuthorLine author={author} date={dateLabel(a.publishedAt)} />
        </div>
      </div>
    </Link>
  );
}

function ArticleCard({ a, author }: { a: ArticleSummary; author: PublicAuthor }) {
  return (
    <Link
      href={`/articles/${a.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-box border border-base-300 bg-base-100 shadow-sm transition-all hover:border-base-content/20 hover:shadow-md"
    >
      {a.cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={a.cover} alt="" className="h-36 w-full object-cover" loading="lazy" />
      )}
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary/80">{CATEGORY_LABEL[a.category]}</p>
        <h2 className="mt-1 text-lg font-semibold leading-snug group-hover:text-primary">{a.title}</h2>
        {a.excerpt && <p className="mt-1.5 line-clamp-2 text-sm text-base-content/70">{a.excerpt}</p>}
        <div className="mt-auto pt-3">
          <AuthorLine author={author} date={dateLabel(a.publishedAt)} />
        </div>
      </div>
    </Link>
  );
}

export default async function ArticlesPage({ searchParams }: { searchParams: Promise<{ categorie?: string }> }) {
  const { categorie } = await searchParams;
  const active = categorie === "site" || categorie === "philologie" ? categorie : "";
  const all = listPublished();
  const articles = active ? all.filter((a) => a.category === active) : all;
  const authors = new Map(articles.map((a) => [a.author.userId, publicAuthor(a.author.userId, a.author.name)]));
  const [featured, ...rest] = articles;

  return (
    <div className="mx-auto max-w-4xl pb-16 pt-8">
      <BreadcrumbJsonLd items={[{ name: "Accueil", path: "/" }, { name: "Articles" }]} />
      <h1 className="text-3xl font-bold tracking-tight">Articles</h1>
      <p className="mt-2 max-w-prose text-base-content/70">
        Le grec de la Bible expliqué par les contributeurs du projet, et les coulisses d&apos;Anaginosko.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
              active === t.key
                ? "border-primary bg-primary text-primary-content"
                : "border-base-300 text-base-content/70 hover:bg-base-200"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {!featured ? (
        <div className="mt-10 rounded-box border border-dashed border-base-300 py-16 text-center text-base-content/60">
          Aucun article publié dans cette rubrique pour le moment.
        </div>
      ) : (
        <>
          <div className="mt-7">
            <FeaturedCard a={featured} author={authors.get(featured.author.userId)!} />
          </div>
          {rest.length > 0 && (
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              {rest.map((a) => (
                <ArticleCard key={a.id} a={a} author={authors.get(a.author.userId)!} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
