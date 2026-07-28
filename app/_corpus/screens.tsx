import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { loadBooksFs, loadChapterFs } from "@/lib/nt-server";
import { bookById, type NtBook } from "@/src/data/nt";
import type { CorpusConfig } from "@/src/data/corpus";
import Reader from "@/src/components/Reader";
import RefJump from "@/src/components/RefJump";
import Breadcrumb from "@/app/_components/Breadcrumb";
import BreadcrumbJsonLd from "@/app/_components/BreadcrumbJsonLd";
import ArticleRenderer from "@/src/components/articles/ArticleRenderer";
import EditBookIntro from "@/src/components/books/EditBookIntro";
import CollapsibleIntro from "@/src/components/books/CollapsibleIntro";
import { getPublishedIntro } from "@/lib/bookIntros";

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
  const books = await loadBooksFs(corpus);
  const b = bookById(books, book);
  const chapters = b ? chapterNumbers(b).length : 0;
  // Description = extrait de l'intro éditoriale si publiée (prose unique, meilleur SEO),
  // sinon le gabarit générique.
  const intro = getPublishedIntro(corpus.id, book);
  const description = intro?.excerpt?.trim()
    ? intro.excerpt
    : `${name} en grec koinè (${corpus.sourceLabel}) : ${chapters} chapitres, texte original lettre par lettre, translittération érasmienne et restituée, traduction française.`;
  return {
    title: name,
    description,
    alternates: { canonical: `${corpus.routePrefix}/${book}` },
    openGraph: { type: "website", locale: "fr_FR", siteName: "Anaginosko", title: `${name} en grec`, description },
  };
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
      <BreadcrumbJsonLd items={[{ name: "Accueil", path: "/" }, { name: corpus.label, path: corpus.routePrefix }]} />
      <Breadcrumb items={[{ label: "Accueil", href: "/", home: true }, { label: corpus.label }]} />
      <h1 className="text-2xl font-bold">{corpus.label}</h1>
      <p className="mt-1 mb-2 text-sm text-base-content/70">
        {books.length} livres · texte grec {corpus.sourceLabel}
      </p>

      <div className="mt-3 max-w-md">
        <RefJump books={books} routePrefix={corpus.routePrefix} />
      </div>

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
  const intro = getPublishedIntro(corpus.id, book);
  const bookJsonLd = {
    "@context": "https://schema.org",
    "@type": "Book",
    name: `${b.name} en grec`,
    inLanguage: "grc",
    url: `${SITE}${corpus.routePrefix}/${book}`,
    isPartOf: { "@type": "Book", name: corpus.label, url: `${SITE}${corpus.routePrefix}` },
    publisher: { "@type": "Organization", name: "Anaginosko", url: SITE },
    ...(intro?.excerpt?.trim() ? { description: intro.excerpt } : {}),
  };

  return (
    <div className="pb-4">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(bookJsonLd) }} />
      <BreadcrumbJsonLd
        items={[
          { name: "Accueil", path: "/" },
          { name: corpus.label, path: corpus.routePrefix },
          { name: b.name, path: `${corpus.routePrefix}/${book}` },
        ]}
      />
      <Breadcrumb
        items={[
          { label: "Accueil", href: "/", home: true },
          { label: corpus.label, href: corpus.routePrefix },
          { label: b.name },
        ]}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{b.name}</h1>
        <EditBookIntro corpus={corpus.id} book={book} />
      </div>
      <p className="mt-1 mb-3 text-sm text-base-content/70">
        {b.chapters} chapitre{b.chapters > 1 ? "s" : ""}
      </p>
      {intro && (
        <CollapsibleIntro corpus={corpus.id} book={book}>
          <ArticleRenderer content={intro.content} />
        </CollapsibleIntro>
      )}
      <div id="chapitres" className="grid scroll-mt-20 grid-cols-6 gap-1.5 sm:grid-cols-10 wide:grid-cols-12">
        {chapterNumbers(b).map((ch) => (
          <Link
            key={ch}
            href={`${corpus.routePrefix}/${book}/${ch}`}
            className="grid h-11 place-items-center rounded-lg border border-base-300 bg-base-100 text-base font-medium transition-colors hover:border-primary/40 hover:bg-base-200"
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
  const greekVerseNums = [...verseGreek.keys()].sort((a, b) => a - b);
  // Même garde que le lecteur : le manifeste `_align` fait foi (chapitres réordonnés
  // ou à additions → bloc) ; sinon heuristique (LXX + ensembles non identiques).
  const frKeys = text.francais ? new Set(Object.keys(text.francais).map(Number)) : null;
  const blocked =
    text.frenchBlock ??
    (corpus.id === "lxx" &&
      !(!!frKeys && greekVerseNums.length === frKeys.size && greekVerseNums.every((v) => frKeys.has(v))));
  const versesAligned = !blocked;
  const verses = greekVerseNums.map((v) => ({
    v,
    grec: verseGreek.get(v)!.join(" "),
    fr: versesAligned ? (text.francais?.[String(v)] ?? null) : null,
  }));
  const frenchBlock =
    !versesAligned && text.francais
      ? Object.keys(text.francais)
          .map(Number)
          .sort((a, b) => a - b)
          .map((v) => `${v} ${text.francais![String(v)]}`)
          .join(" ")
      : null;

  const nums = chapterNumbers(b);
  const idx = nums.indexOf(ch);
  const prev = idx > 0 ? nums[idx - 1] : null;
  const next = idx < nums.length - 1 ? nums[idx + 1] : null;

  // Aux frontières d'un livre, la lecture suivie continue sur le livre voisin (au
  // lieu d'une impasse) : livres en ordre canonique, on saute au 1er/dernier chapitre.
  const bIdx = books.findIndex((x) => x.id === book);
  const nextBook = next == null && bIdx >= 0 && bIdx < books.length - 1 ? books[bIdx + 1] : null;
  const prevBook = prev == null && bIdx > 0 ? books[bIdx - 1] : null;
  const bookName = (id: string) => corpus.bookNames[id] ?? id;
  const chLabel = (n: number) => (n === 0 ? "Prol." : String(n));
  const firstCh = (bk: NtBook) => chapterNumbers(bk)[0];
  const lastCh = (bk: NtBook) => {
    const n = chapterNumbers(bk);
    return n[n.length - 1];
  };

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
    <div className="reading-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <h1 className="sr-only">{label}</h1>
      <div className="reading-col">
        <Breadcrumb
          items={[
            { label: "Accueil", href: "/", home: true },
            { label: corpus.shortLabel, href: corpus.routePrefix },
            { label: name, href: `${corpus.routePrefix}/${book}` },
            { label: ch === 0 ? "Prologue" : String(ch) },
          ]}
        />
      </div>
      <Reader text={text} />

      <section className="sr-only" aria-label={`${label}, texte continu`}>
        {verses.map((vs) => (
          <p key={vs.v}>
            <span lang="grc">
              {vs.v} {vs.grec}
            </span>
            {vs.fr ? <span lang="fr"> : {vs.fr}</span> : null}
          </p>
        ))}
        {frenchBlock ? <p lang="fr">{frenchBlock}</p> : null}
      </section>

      <nav className="reading-col mt-8 flex items-center justify-between gap-3">
        {prev != null ? (
          <Link href={`${corpus.routePrefix}/${book}/${prev}`} className="btn btn-sm btn-outline border-base-300">
            ← {prev === 0 ? "Prologue" : `Chapitre ${prev}`}
          </Link>
        ) : prevBook ? (
          <Link
            href={`${corpus.routePrefix}/${prevBook.id}/${lastCh(prevBook)}`}
            className="btn btn-sm btn-outline border-base-300"
            title={`${bookName(prevBook.id)} ${chLabel(lastCh(prevBook))}`}
          >
            ← {bookName(prevBook.id)}
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
        ) : nextBook ? (
          <Link
            href={`${corpus.routePrefix}/${nextBook.id}/${firstCh(nextBook)}`}
            className="btn btn-sm btn-primary"
            title={`${bookName(nextBook.id)} ${chLabel(firstCh(nextBook))}`}
          >
            {bookName(nextBook.id)} →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}
