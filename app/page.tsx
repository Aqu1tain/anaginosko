import type { Metadata } from "next";
import Link from "next/link";
import { textsByCollection, verseCount, type Text } from "../src/data/texts";
import { loadBooksFs, loadChapterFs, loadLemmasFs } from "../lib/nt-server";
import { NT, LXX } from "../src/data/corpus";
import { listPublished } from "../lib/articles";
import { CATEGORY_LABEL } from "../src/components/articles/labels";
import ResumeReading from "./_components/ResumeReading";
import RefJump from "../src/components/RefJump";
import HeroVerse, { type HeroWord } from "../src/components/HeroVerse";

export const metadata: Metadata = {
  description:
    "Anaginosko : lire la Bible en grec, lettre par lettre. Nouveau Testament et Septante en grec koinè, prononciation érasmienne et restituée, concordance et traduction française. Gratuit, sans publicité.",
  alternates: { canonical: "/" },
};

// Les articles sont publiés au runtime (ARTICLES_DIR) : l'accueil se régénère
// périodiquement pour les refléter (et immédiatement via revalidatePath à la
// publication). Sans cela, la page resterait figée à l'état du build.
export const revalidate = 300;

const TIPEEE = "https://fr.tipeee.com/anaginosko";

const SHORTCUTS = [
  { href: "/lectures", label: "Lectures du jour" },
  { href: "/text/passages-1", label: "Prologue de Jean" },
  { href: "/text/passages-2", label: "Béatitudes" },
  { href: "/lxx/gen/1", label: "Genèse 1" },
  { href: `/concordance/${encodeURIComponent("ἀγάπη")}`, label: "ἀγάπη", greek: true },
];

const chip = "inline-flex min-h-11 items-center rounded-full bg-base-300 px-4 text-[0.95rem] transition-colors hover:text-accent";
const sectionTitle = "font-greek text-3xl font-bold leading-tight wide:text-4xl";

// « Jean 1:1-18 (Prologue) » -> « Jean 1, 1-18 » et « Prologue ».
function splitReference(reference: string) {
  const m = reference.match(/^(.*?)\s*(?:\((.+)\))?$/);
  const theme = m?.[2];
  return {
    ref: (m?.[1] ?? reference).replace(":", ", "),
    theme: theme ? theme.charAt(0).toUpperCase() + theme.slice(1) : null,
  };
}

const incipit = (grec: string, words = 5) =>
  grec.split(/\s+/).slice(0, words).join(" ").replace(/[,.;·;·]+$/u, "");

function Hero({ verse, french, word, start }: { verse: Text; french: string | null; word: HeroWord | null; start: string }) {
  return (
    <section className="grid gap-10 pt-8 wide:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] wide:items-center wide:gap-14 wide:pt-16">
      <div>
        <h1 className="font-greek text-4xl font-bold leading-[1.08] tracking-tight wide:text-6xl">
          Lire la Bible en grec, lettre par lettre
        </h1>
        <p className="mt-5 max-w-[36ch] text-lg leading-relaxed text-base-content/75 wide:text-xl">
          Le Nouveau Testament et la Septante, chaque mot expliqué, la traduction en regard.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={start} className="btn btn-primary btn-lg rounded-full px-7">
            Commencer à lire
          </Link>
          <Link href="/alphabet" className="btn btn-outline btn-primary btn-lg rounded-full px-7">
            Apprendre l’alphabet
          </Link>
        </div>
      </div>
      <HeroVerse text={verse} french={french} word={word} />
    </section>
  );
}

function Jump({ books }: { books: { id: string; name: string; chapters: number; routePrefix: string }[] }) {
  return (
    <section className="mt-14 rounded-box bg-base-200 px-5 py-7 wide:mt-28 wide:px-10 wide:py-10">
      <label htmlFor="aller" className="block font-semibold">
        Aller directement à un passage ou à un mot
      </label>
      <div className="mt-3">
        <RefJump id="aller" books={books} routePrefix={NT.routePrefix} placeholder="Jean 3, 16 ou λόγος" submitLabel="Ouvrir" />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <ResumeReading />
        {SHORTCUTS.map((s) => (
          <Link key={s.href} href={s.href} lang={s.greek ? "grc" : undefined} className={`${chip} ${s.greek ? "font-greek text-lg" : ""}`}>
            {s.label}
          </Link>
        ))}
      </div>
    </section>
  );
}

function Passages({ passages }: { passages: Text[] }) {
  return (
    <section className="mt-16 wide:mt-20">
      <h2 className={sectionTitle}>Passages pour commencer</h2>
      <ul className="-mx-4 mt-6 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-3 wide:mx-0 wide:scroll-px-0 wide:px-0">
        {passages.map((t) => {
          const { ref, theme } = splitReference(t.reference);
          return (
            <li key={t.id} className="w-64 shrink-0 snap-start">
              <Link
                href={`/text/${t.id}`}
                className="flex h-full flex-col gap-3 rounded-box border border-base-300 bg-base-100 p-6 transition-colors hover:border-accent/50"
              >
                <span lang="grc" className="font-greek text-xl leading-snug text-accent">
                  {incipit(t.grec)}
                </span>
                <span className="mt-auto font-semibold">{ref}</span>
                <span className="text-sm text-base-content/70">
                  {theme ? `${theme}, ` : ""}
                  {verseCount(t)} versets
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Figures({ figures }: { figures: { href: string; value: number; label: string }[] }) {
  return (
    <section className="mt-14 grid gap-8 border-t border-base-300 pt-12 sm:grid-cols-3 wide:mt-16 wide:pt-16">
      {figures.map((f) => (
        <Link key={f.href} href={f.href} className="group flex flex-col gap-2">
          <span className="font-greek text-5xl leading-none tabular-nums wide:text-6xl">{f.value.toLocaleString("fr-FR")}</span>
          <span className="text-lg transition-colors group-hover:text-accent">{f.label}</span>
        </Link>
      ))}
    </section>
  );
}

// Derniers articles publiés. Absents tant que rien n'est publié (pas de section vide).
function LatestArticles() {
  const latest = listPublished().slice(0, 2);
  if (latest.length === 0) return null;
  return (
    <section className="mt-14 border-t border-base-300 pt-12 wide:mt-16 wide:pt-16">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className={sectionTitle}>Derniers articles</h2>
        <Link href="/articles" className="font-semibold text-primary hover:underline">
          Tous les articles
        </Link>
      </div>
      <div className="mt-8 grid gap-8 wide:grid-cols-2 wide:gap-12">
        {latest.map((a) => (
          <Link key={a.id} href={`/articles/${a.slug}`} className="group flex flex-col gap-1.5">
            <span className="text-sm text-base-content/65">{CATEGORY_LABEL[a.category]}</span>
            <span className="font-greek text-2xl font-bold leading-snug transition-colors group-hover:text-accent">{a.title}</span>
            {a.excerpt && <span className="line-clamp-2 text-base-content/70">{a.excerpt}</span>}
          </Link>
        ))}
      </div>
    </section>
  );
}

function Support() {
  return (
    <section
      data-nosnippet=""
      className="mt-14 flex flex-col gap-5 rounded-box bg-base-200 px-5 py-7 wide:mt-16 wide:flex-row wide:items-center wide:justify-between wide:px-10 wide:py-9"
    >
      <p className="max-w-[52ch] text-lg leading-relaxed text-base-content/80">
        Un projet libre et indépendant, gratuit et sans publicité. Votre soutien finance la suite.
      </p>
      <a href={TIPEEE} target="_blank" rel="noreferrer noopener" className="btn btn-accent btn-lg self-start rounded-full px-7 wide:self-auto">
        Nous soutenir
      </a>
    </section>
  );
}

export default async function Home() {
  const [ntBooks, lxxBooks, ntLemmas, lxxLemmas, jn1] = await Promise.all([
    loadBooksFs(NT),
    loadBooksFs(LXX),
    loadLemmasFs(NT),
    loadLemmasFs(LXX),
    loadChapterFs("jn", 1, NT),
  ]);
  // Recherche de référence globale : NT et LXX fusionnés, chaque livre pointe vers
  // son corpus (les noms et ids ne se chevauchent pas entre les deux).
  const allBooks = [
    ...ntBooks.map((b) => ({ id: b.id, name: b.name, chapters: b.chapters, routePrefix: NT.routePrefix })),
    ...lxxBooks.map((b) => ({ id: b.id, name: b.name, chapters: b.chapters, routePrefix: LXX.routePrefix })),
  ];
  // Verset vitrine (Jean 1,1) réduit au 1er verset : charge légère, rendu interactif
  // par HeroVerse via le SheetContext global.
  const verse: Text = { ...jn1, francais: null, mots: (jn1.mots ?? []).filter((m) => m.verse === 1) };
  const logos = ntLemmas.find((e) => e.lemma === "λόγος");
  const word = logos ? { lemma: logos.lemma, gloss: "parole", nature: logos.nature.toLowerCase(), count: logos.count } : null;
  const passages = textsByCollection("passages");
  const lemmaCount = new Set([...ntLemmas, ...lxxLemmas].map((e) => e.lemma)).size;

  return (
    <div>
      <Hero verse={verse} french={jn1.francais?.["1"] ?? null} word={word} start={`/text/${passages[0]?.id ?? "passages-1"}`} />
      <Jump books={allBooks} />
      <Passages passages={passages} />
      <Figures
        figures={[
          { href: "/nt", value: ntBooks.length, label: "livres du Nouveau Testament" },
          { href: "/lxx", value: lxxBooks.length, label: "livres de la Septante" },
          { href: "/concordance", value: lemmaCount, label: "mots grecs dans la concordance" },
        ]}
      />
      <LatestArticles />
      <Support />
    </div>
  );
}
