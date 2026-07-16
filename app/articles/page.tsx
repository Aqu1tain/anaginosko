import type { Metadata } from "next";
import Link from "next/link";
import { listPublished } from "@/lib/articles";
import { CATEGORY_LABEL, byline } from "@/src/components/articles/labels";
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
  { key: "site", label: "Site", href: "/articles?categorie=site" },
];

export default async function ArticlesPage({ searchParams }: { searchParams: Promise<{ categorie?: string }> }) {
  const { categorie } = await searchParams;
  const active = categorie === "site" || categorie === "philologie" ? categorie : "";
  const all = listPublished();
  const articles = active ? all.filter((a) => a.category === active) : all;

  return (
    <div className="mx-auto max-w-3xl pb-16 pt-6">
      <BreadcrumbJsonLd items={[{ name: "Accueil", path: "/" }, { name: "Articles" }]} />
      <h1 className="text-3xl font-bold">Articles</h1>
      <p className="mt-2 text-base-content/70">Publications sur le grec de la Bible et la vie du projet.</p>

      <div role="tablist" className="tabs tabs-boxed mt-5 w-fit">
        {TABS.map((t) => (
          <Link key={t.key} href={t.href} className={`tab ${active === t.key ? "tab-active" : ""}`} role="tab">
            {t.label}
          </Link>
        ))}
      </div>

      {articles.length === 0 ? (
        <p className="mt-8 text-base-content/60">Aucun article pour le moment.</p>
      ) : (
        <ul className="mt-6 space-y-5">
          {articles.map((a) => (
            <li key={a.id}>
              <Link href={`/articles/${a.slug}`} className="group block rounded-box border border-base-300 p-5 transition-colors hover:bg-base-200">
                <div className="flex items-center gap-2 text-xs">
                  <span className="badge badge-outline badge-sm">{CATEGORY_LABEL[a.category]}</span>
                  {a.publishedAt && (
                    <time className="text-base-content/50">{new Date(a.publishedAt).toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" })}</time>
                  )}
                </div>
                <h2 className="mt-2 text-xl font-semibold group-hover:text-primary">{a.title}</h2>
                {a.excerpt && <p className="mt-1 line-clamp-2 text-base-content/75">{a.excerpt}</p>}
                <p className="mt-2 text-sm text-base-content/55">{byline(a)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
