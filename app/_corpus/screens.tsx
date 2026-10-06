import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { loadBooksFs, loadChapterFs } from "@/lib/nt-server";
import { bookById, chapterNumbers, type NtBook } from "@/src/data/nt";
import type { CorpusConfig } from "@/src/data/corpus";
import Reader from "@/src/components/Reader";
import RefJump from "@/src/components/RefJump";
import ChapterSwitcher from "@/src/components/ChapterSwitcher";
import { loadBibleNav } from "@/lib/bibleNav";
import Breadcrumb from "@/app/_components/Breadcrumb";
import BreadcrumbJsonLd from "@/app/_components/BreadcrumbJsonLd";
import ArticleRenderer from "@/src/components/articles/ArticleRenderer";
import EditBookIntro from "@/src/components/books/EditBookIntro";
import CollapsibleIntro from "@/src/components/books/CollapsibleIntro";
import { getPublishedIntro, bookIntroIsLong } from "@/lib/bookIntros";
import JsonLd from "@/app/_components/JsonLd";
import { SITE, clip, pageMetadata } from "@/lib/seo";
import { chapterVerses } from "@/lib/chapterVerses";

// Écrans de lecture partagés entre corpus (NT, LXX). Les fichiers de route ne sont
// que de fines enveloppes passant la config du corpus. Les valeurs NT reproduisent
// les littéraux historiques (URL, libellés, JSON-LD) à l'identique.

const chapterLabel = (name: string, ch: number): string =>
  ch === 0 ? `${name}, prologue` : `${name} ${ch}`;

// --- generateStaticParams / generateMetadata helpers ---

export async function bookStaticParams(corpus: CorpusConfig) {
  const books = await loadBooksFs(corpus);
  return books.map((b) => ({ book: b.id }));
}

export async function tocMetadata(corpus: CorpusConfig): Promise<Metadata> {
  const books = await loadBooksFs(corpus);
  return pageMetadata({
    title: `${corpus.label} en grec`,
    description: `Les ${books.length} livres ${corpus.genitive} en grec (${corpus.sourceLabel}), avec la traduction française en regard et l'analyse de chaque mot : lemme, morphologie, notice du Bailly.`,
    path: corpus.routePrefix,
  });
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
    ? clip(intro.excerpt, 220)
    : `${name} en grec (${corpus.sourceLabel}) et en français : ${chapters} chapitre${chapters > 1 ? "s" : ""}, chaque mot analysé (lemme, morphologie, notice du Bailly), traduction française en regard.`;
  return pageMetadata({ title: `${name} en grec`, description, path: `${corpus.routePrefix}/${book}` });
}

export async function chapterMetadata(
  corpus: CorpusConfig,
  params: Promise<{ book: string; chapter: string }>,
): Promise<Metadata> {
  const { book, chapter } = await params;
  const name = corpus.bookNames[book] ?? "Livre";
  const label = chapterLabel(name, Number(chapter));
  const path = `${corpus.routePrefix}/${book}/${chapter}`;
  const text = await loadChapterFs(book, Number(chapter), corpus).catch(() => null);
  const first = text ? chapterVerses(text, corpus).verses[0] : undefined;
  // L'incipit grec et français rend chaque description unique et répond aux
  // recherches de citation (« Ἐν ἀρχῇ ἦν ὁ λόγος »).
  const incipit = first ? ` « ${clip(first.grec, 70)} »${first.fr ? ` : ${clip(first.fr, 70)}` : ""}` : "";
  return pageMetadata({
    title: `${label} en grec et en français`,
    ogTitle: `${label} en grec`,
    description: `${label} en grec (${corpus.sourceLabel}), traduction française et analyse de chaque mot.${incipit}`,
    path,
    type: "article",
    markdown: `${path}.md`,
  });
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
      <JsonLd data={bookJsonLd} />
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
        <CollapsibleIntro corpus={corpus.id} book={book} long={bookIntroIsLong(intro.content)}>
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
  const [text, bibleNav] = await Promise.all([loadChapterFs(book, ch, corpus), loadBibleNav()]);

  // Texte continu (grec + français), rendu serveur en tête de page pour les moteurs,
  // les assistants et les lecteurs d'écran ; le lecteur interactif suit.
  const { verses, frenchBlock } = chapterVerses(text, corpus);

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
  const stepTo = (bk: string, n: number) => ({
    href: `${corpus.routePrefix}/${bk}/${n}`,
    label: chapterLabel(bookName(bk), n),
  });
  const prevStep = prev != null ? stepTo(book, prev) : prevBook ? stepTo(prevBook.id, lastCh(prevBook)) : null;
  const nextStep = next != null ? stepTo(book, next) : nextBook ? stepTo(nextBook.id, firstCh(nextBook)) : null;
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
        name: `${label} en grec`,
        inLanguage: ["grc", "fr"],
        url,
        isAccessibleForFree: true,
        isPartOf: {
          "@type": "Book",
          name: name,
          url: `${SITE}${corpus.routePrefix}/${book}`,
          isPartOf: { "@type": "Book", name: corpus.label, url: `${SITE}${corpus.routePrefix}` },
        },
        isBasedOn: corpus.sourceUrl,
        encoding: { "@type": "MediaObject", encodingFormat: "text/markdown", contentUrl: `${url}.md` },
        publisher: { "@type": "Organization", name: "Anaginosko", url: SITE },
      },
    ],
  };

  return (
    <div className="reading-page">
      <JsonLd data={jsonLd} />
      <h1 className="sr-only">{label}</h1>
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
      <div className="reading-col flex flex-wrap items-center gap-x-4 gap-y-1">
        <Breadcrumb
          items={[
            { label: "Accueil", href: "/", home: true },
            { label: corpus.shortLabel, href: corpus.routePrefix },
            { label: name, href: `${corpus.routePrefix}/${book}` },
          ]}
        />
        <ChapterSwitcher
          corpora={bibleNav}
          current={{ corpus: corpus.id, book, chapter: ch }}
          label={ch === 0 ? `${name}, prologue` : `${name} ${ch}`}
          prev={prevStep}
          next={nextStep}
        />
      </div>
      <Reader text={text} />

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
