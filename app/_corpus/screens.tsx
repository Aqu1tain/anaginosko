import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { loadBooksFs, loadChapterFs } from "@/lib/nt-server";
import { bookById, type NtBook } from "@/src/data/nt";
import type { CorpusConfig } from "@/src/data/corpus";
import Reader from "@/src/components/Reader";
import Breadcrumb from "@/app/_components/Breadcrumb";

// Écrans de lecture partagés entre corpus (NT, LXX). Les fichiers de route ne sont
// que de fines enveloppes passant la config du corpus. Les valeurs NT reproduisent
// les littéraux historiques (URL, libellés, JSON-LD) à l'identique.

const SITE = "https://anaginosko.fr";

// Chapitres réels d'un livre : contigus (NT) ou liste explicite (LXX : Proverbes
// a des trous, le Siracide commence au prologue 0).
const chapterNumbers = (b: NtBook): number[] =>
  b.chapterList ?? Array.from({ length: b.chapters }, (_, i) => i + 1);

const chapterLabel = (name: string, ch: number): string =>
  ch === 0 ? `${name}, prologue` : `${name} ${ch}`;

// --- generateStaticParams / generateMetadata helpers ---

export async function bookStaticParams(corpus: CorpusConfig) {
  const books = await loadBooksFs(corpus);
  return books.map((b) => ({ book: b.id }));
}

export async function chapterStaticParams(corpus: CorpusConfig) {
  const books = await loadBooksFs(corpus);
  return books.flatMap((b) => chapterNumbers(b).map((ch) => ({ book: b.id, chapter: String(ch) })));
}

export async function tocMetadata(corpus: CorpusConfig): Promise<Metadata> {
  const books = await loadBooksFs(corpus);
  return {
    title: corpus.label,
    description: `Les ${books.length} livres ${corpus.genitive} en grec koinè (${corpus.sourceLabel}), chapitre par chapitre.`,
    alternates: { canonical: corpus.routePrefix },
  };
}

export async function bookMetadata(corpus: CorpusConfig, params: Promise<{ book: string }>): Promise<Metadata> {
  const { book } = await params;
  const name = corpus.bookNames[book] ?? "Livre";
  return { title: name, alternates: { canonical: `${corpus.routePrefix}/${book}` } };
}

export async function chapterMetadata(
  corpus: CorpusConfig,
  params: Promise<{ book: string; chapter: string }>,
): Promise<Metadata> {
  const { book, chapter } = await params;
  const name = corpus.bookNames[book] ?? "Livre";
  const label = chapterLabel(name, Number(chapter));
  return {
    title: label,
    description: `${name} chapitre ${chapter} en grec koinè (${corpus.sourceLabel}), translittération érasmienne et restituée, traduction française.`,
    alternates: { canonical: `${corpus.routePrefix}/${book}/${chapter}` },
    openGraph: { type: "article", locale: "fr_FR", siteName: "Anaginosko", title: label },
  };
}

// --- Écrans ---

export async function TocScreen({ corpus }: { corpus: CorpusConfig }) {
  const books = await loadBooksFs(corpus);
  return (
    <div className="pb-4">
      <Breadcrumb items={[{ label: "Accueil", href: "/", home: true }, { label: corpus.label }]} />
      <h1 className="text-2xl font-bold">{corpus.label}</h1>
      <p className="mt-1 mb-2 text-sm text-base-content/70">
        {books.length} livres · texte grec {corpus.sourceLabel}
      </p>

      {corpus.editorialGroups.map((group) => (
        <section key={group.title} className="pt-5">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-base-content/70">
            {group.title}
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {group.ids.map((id) => {
              const b = bookById(books, id);
              if (!b) return null;
              return (
                <Link
                  key={id}
                  href={`${corpus.routePrefix}/${id}`}
                  className="flex items-center justify-between gap-2 rounded-box border border-base-300 bg-base-100 px-3.5 py-2.5 transition-colors hover:border-primary/40"
                >
                  <span className="min-w-0 truncate font-medium">{b.name}</span>
                  <span className="badge badge-sm badge-ghost shrink-0">{b.chapters}</span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

export async function BookScreen({ corpus, params }: { corpus: CorpusConfig; params: Promise<{ book: string }> }) {
  const { book } = await params;
  const books = await loadBooksFs(corpus);
  const b = bookById(books, book);
  if (!b) notFound();

  return (
    <div className="pb-4">
      <Breadcrumb
        items={[
          { label: "Accueil", href: "/", home: true },
          { label: corpus.label, href: corpus.routePrefix },
          { label: b.name },
        ]}
      />
      <h1 className="text-2xl font-bold">{b.name}</h1>
      <p className="mt-1 mb-3 text-sm text-base-content/70">
        {b.chapters} chapitre{b.chapters > 1 ? "s" : ""}
      </p>
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-8">
        {chapterNumbers(b).map((ch) => (
          <Link
            key={ch}
            href={`${corpus.routePrefix}/${book}/${ch}`}
            className="grid aspect-square place-items-center rounded-box border border-base-300 bg-base-100 text-lg font-medium transition-colors hover:border-primary/40 hover:bg-base-200"
          >
            {ch === 0 ? "Pr." : ch}
          </Link>
        ))}
      </div>
    </div>
  );
}

export async function ChapterScreen({
  corpus,
  params,
}: {
  corpus: CorpusConfig;
  params: Promise<{ book: string; chapter: string }>;
}) {
  const { book, chapter } = await params;
  const ch = Number(chapter);
  const books = await loadBooksFs(corpus);
  const b = bookById(books, book);
  if (!b || !Number.isInteger(ch) || !chapterNumbers(b).includes(ch)) notFound();
  const text = await loadChapterFs(book, ch, corpus);

  // Bloc de versets contigus (grec + français), rendu côté serveur pour les
  // moteurs et lecteurs d'écran ; le lecteur interactif éclate le grec par-dessus.
  const verseGreek = new Map<number, string[]>();
  for (const m of text.mots ?? []) {
    if (m.verse == null) continue;
    if (!verseGreek.has(m.verse)) verseGreek.set(m.verse, []);
    verseGreek.get(m.verse)!.push(m.grec);
  }
  const verses = [...verseGreek.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([v, words]) => ({ v, grec: words.join(" "), fr: text.francais?.[String(v)] ?? null }));

  const nums = chapterNumbers(b);
  const idx = nums.indexOf(ch);
  const prev = idx > 0 ? nums[idx - 1] : null;
  const next = idx < nums.length - 1 ? nums[idx + 1] : null;

  const name = corpus.bookNames[book] ?? "Livre";
  const label = chapterLabel(name, ch);
  const url = `${SITE}${corpus.routePrefix}/${book}/${ch}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Accueil", item: `${SITE}/` },
          { "@type": "ListItem", position: 2, name: corpus.label, item: `${SITE}${corpus.routePrefix}` },
          { "@type": "ListItem", position: 3, name, item: `${SITE}${corpus.routePrefix}/${book}` },
          { "@type": "ListItem", position: 4, name: label, item: url },
        ],
      },
      {
        "@type": "CreativeWork",
        name: label,
        inLanguage: "grc",
        url,
        isPartOf: { "@type": "Book", name: corpus.label, inLanguage: "grc" },
        isBasedOn: corpus.sourceUrl,
        publisher: { "@type": "Organization", name: "Anaginosko", url: SITE },
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <h1 className="sr-only">{label}</h1>
      <Breadcrumb
        items={[
          { label: "Accueil", href: "/", home: true },
          { label: corpus.shortLabel, href: corpus.routePrefix },
          { label: name, href: `${corpus.routePrefix}/${book}` },
          { label: ch === 0 ? "Prologue" : String(ch) },
        ]}
      />
      <Reader text={text} />

      <section className="sr-only" aria-label={`${label}, texte continu`}>
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
        {prev != null ? (
          <Link href={`${corpus.routePrefix}/${book}/${prev}`} className="btn btn-sm btn-outline border-base-300">
            ← {prev === 0 ? "Prologue" : `Chapitre ${prev}`}
          </Link>
        ) : (
          <span />
        )}
        <Link href={`${corpus.routePrefix}/${book}`} className="btn btn-sm btn-ghost">
          Chapitres
        </Link>
        {next != null ? (
          <Link href={`${corpus.routePrefix}/${book}/${next}`} className="btn btn-sm btn-outline border-base-300">
            Chapitre {next} →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </>
  );
}
