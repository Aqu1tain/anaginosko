import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { loadBooksFs, loadChapterFs } from "@/lib/nt-server";
import { bookById, BOOK_NAMES } from "@/src/data/nt";
import Reader from "@/src/components/Reader";

export const dynamicParams = false;

export async function generateStaticParams() {
  const books = await loadBooksFs();
  return books.flatMap((b) =>
    Array.from({ length: b.chapters }, (_, i) => ({ book: b.id, chapter: String(i + 1) })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ book: string; chapter: string }>;
}): Promise<Metadata> {
  const { book, chapter } = await params;
  const name = BOOK_NAMES[book] ?? "Livre";
  return {
    title: `${name} ${chapter}`,
    description: `${name} chapitre ${chapter} en grec koinè (SBLGNT) — translittération érasmienne et restituée, traduction française.`,
    alternates: { canonical: `/nt/${book}/${chapter}` },
    openGraph: { type: "article", locale: "fr_FR", title: `${name} ${chapter}` },
  };
}

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ book: string; chapter: string }>;
}) {
  const { book, chapter } = await params;
  const ch = Number(chapter);
  const books = await loadBooksFs();
  const b = bookById(books, book);
  if (!b || !Number.isInteger(ch) || ch < 1 || ch > b.chapters) notFound();
  const text = await loadChapterFs(book, ch);

  return (
    <>
      <Reader text={text} />
      <nav className="mt-8 flex items-center justify-between gap-3">
        {ch > 1 ? (
          <Link href={`/nt/${book}/${ch - 1}`} className="btn btn-sm btn-outline border-base-300">
            ← Chapitre {ch - 1}
          </Link>
        ) : (
          <span />
        )}
        <Link href={`/nt/${book}`} className="btn btn-sm btn-ghost">
          Chapitres
        </Link>
        {ch < b.chapters ? (
          <Link href={`/nt/${book}/${ch + 1}`} className="btn btn-sm btn-outline border-base-300">
            Chapitre {ch + 1} →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </>
  );
}
