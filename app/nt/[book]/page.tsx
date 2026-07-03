import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { loadBooksFs } from "../../../lib/nt-server";
import { bookById, BOOK_NAMES } from "../../../src/data/nt";
import Breadcrumb from "../../_components/Breadcrumb";
import BreadcrumbJsonLd from "../../_components/BreadcrumbJsonLd";

export const dynamicParams = false;

export async function generateStaticParams() {
  const books = await loadBooksFs();
  return books.map((b) => ({ book: b.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ book: string }>;
}): Promise<Metadata> {
  const { book } = await params;
  const name = BOOK_NAMES[book] ?? "Livre";
  const books = await loadBooksFs();
  const b = bookById(books, book);
  const description = `${name} en grec koinè (SBLGNT) : ${b?.chapters ?? 0} chapitres, texte original lettre par lettre, translittération érasmienne et restituée, traduction française.`;
  return {
    title: name,
    description,
    alternates: { canonical: `/nt/${book}` },
    openGraph: { type: "website", locale: "fr_FR", siteName: "Anaginosko", title: `${name} en grec`, description },
  };
}

export default async function NtBookPage({ params }: { params: Promise<{ book: string }> }) {
  const { book } = await params;
  const books = await loadBooksFs();
  const b = bookById(books, book);
  if (!b) notFound();

  return (
    <div className="pb-4">
      <BreadcrumbJsonLd
        items={[
          { name: "Accueil", path: "/" },
          { name: "Nouveau Testament", path: "/nt" },
          { name: b.name, path: `/nt/${book}` },
        ]}
      />
      <Breadcrumb
        items={[
          { label: "Accueil", href: "/", home: true },
          { label: "Nouveau Testament", href: "/nt" },
          { label: b.name },
        ]}
      />
      <h1 className="text-2xl font-bold">{b.name}</h1>
      <p className="mt-1 mb-3 text-sm text-base-content/70">
        {b.chapters} chapitre{b.chapters > 1 ? "s" : ""}
      </p>
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-8">
        {Array.from({ length: b.chapters }, (_, i) => i + 1).map((ch) => (
          <Link
            key={ch}
            href={`/nt/${book}/${ch}`}
            className="grid aspect-square place-items-center rounded-box border border-base-300 bg-base-100 text-lg font-medium transition-colors hover:border-primary/40 hover:bg-base-200"
          >
            {ch}
          </Link>
        ))}
      </div>
    </div>
  );
}
