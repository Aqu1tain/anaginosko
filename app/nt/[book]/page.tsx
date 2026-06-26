import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { loadBooksFs } from "../../../lib/nt-server";
import { bookById, BOOK_NAMES } from "../../../src/data/nt";
import Breadcrumb from "../../_components/Breadcrumb";

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
  return { title: name, alternates: { canonical: `/nt/${book}` } };
}

export default async function NtBookPage({ params }: { params: Promise<{ book: string }> }) {
  const { book } = await params;
  const books = await loadBooksFs();
  const b = bookById(books, book);
  if (!b) notFound();

  return (
    <div className="pb-4">
      <Breadcrumb
        items={[
          { label: "Accueil", href: "/" },
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
