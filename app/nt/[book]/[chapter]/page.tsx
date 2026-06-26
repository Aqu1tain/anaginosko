import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { loadBooksFs, loadChapterFs } from "@/lib/nt-server";
import { bookById, BOOK_NAMES } from "@/src/data/nt";
import Reader from "@/src/components/Reader";
import Breadcrumb from "@/app/_components/Breadcrumb";

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
    description: `${name} chapitre ${chapter} en grec koinè (SBLGNT), translittération érasmienne et restituée, traduction française.`,
    alternates: { canonical: `/nt/${book}/${chapter}` },
    openGraph: { type: "article", locale: "fr_FR", siteName: "Anaginosko", title: `${name} ${chapter}` },
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

  // Bloc de versets contigus (grec + français), rendu côté serveur. Le lecteur
  // interactif éclate le grec lettre par lettre (spans cliquables) ; ce bloc
  // donne aux moteurs et aux lecteurs d'écran le texte propre et continu, et
  // rend la traduction française indexable (masquée par défaut dans le lecteur).
  const verseGreek = new Map<number, string[]>();
  for (const m of text.mots ?? []) {
    if (m.verse == null) continue;
    if (!verseGreek.has(m.verse)) verseGreek.set(m.verse, []);
    verseGreek.get(m.verse)!.push(m.grec);
  }
  const verses = [...verseGreek.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([v, words]) => ({ v, grec: words.join(" "), fr: text.francais?.[String(v)] ?? null }));

  const SITE = "https://anaginosko.fr";
  const url = `${SITE}/nt/${book}/${ch}`;
  const name = BOOK_NAMES[book] ?? "Livre";
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Accueil", item: `${SITE}/` },
          { "@type": "ListItem", position: 2, name: "Nouveau Testament", item: `${SITE}/nt` },
          { "@type": "ListItem", position: 3, name, item: `${SITE}/nt/${book}` },
          { "@type": "ListItem", position: 4, name: `${name} ${ch}`, item: url },
        ],
      },
      {
        "@type": "CreativeWork",
        name: `${name} ${ch}`,
        inLanguage: "grc",
        url,
        isPartOf: { "@type": "Book", name: "Nouveau Testament", inLanguage: "grc" },
        isBasedOn: "https://sblgnt.com/",
        publisher: { "@type": "Organization", name: "Anaginosko", url: SITE },
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <h1 className="sr-only">
        {name} {ch}
      </h1>
      <Breadcrumb
        items={[
          { label: "Accueil", href: "/", home: true },
          { label: "NT", href: "/nt" },
          { label: name, href: `/nt/${book}` },
          { label: String(ch) },
        ]}
      />
      <Reader text={text} />

      <section className="sr-only" aria-label={`${name} ${ch}, texte continu`}>
        {verses.map((vs) => (
          <p key={vs.v}>
            <span lang="grc">
              {vs.v} {vs.grec}
            </span>
            {vs.fr ? <span lang="fr"> — {vs.fr}</span> : null}
          </p>
        ))}
      </section>

      <nav className="mt-8 flex max-w-2xl items-center justify-between gap-3">
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
