import type { Metadata } from "next";
import Link from "next/link";
import { collections, lengthLabel, minNiveau, textsByCollection, type Text } from "../src/data/texts";
import { loadBooksFs } from "../lib/nt-server";
import { NT, LXX } from "../src/data/corpus";
import SupportBanner from "./_components/SupportBanner";
import ResumeReading from "./_components/ResumeReading";
import RefJump from "../src/components/RefJump";

export const metadata: Metadata = {
  description:
    "Anaginosko : lire la Bible en grec, lettre par lettre. Nouveau Testament et Septante en grec koinè, prononciation érasmienne et restituée, concordance et traduction française. Gratuit, sans publicité.",
  alternates: { canonical: "/" },
};

const SCRIBE_ALT = "Un scribe copiant l’Évangile sur un rouleau de papyrus";

// Intro partagée (héros desktop et mobile) : « érasmienne et restituée » mène à la
// page dédiée, orpheline de l'accueil jusqu'ici.
function IntroText({ className = "" }: { className?: string }) {
  return (
    <p className={className}>
      La Bible, lettre par lettre. Touchez n’importe quelle lettre d’un texte pour découvrir son nom et sa
      prononciation,{" "}
      <Link href="/prononciation" className="link decoration-primary/40 underline-offset-2">
        érasmienne et restituée
      </Link>
      .
    </p>
  );
}

const TOOLS = [
  { href: "/alphabet", title: "Alphabet", desc: "Les 24 lettres : nom, tracé et prononciation." },
  { href: "/prononciation", title: "Prononciation", desc: "Érasmienne et restituée, comparées." },
  { href: "/concordance", title: "Concordance", desc: "Chercher un mot grec : sens, répartition, occurrences." },
];

function Tools() {
  return (
    <section className="pt-11 wide:pt-16">
      <h2 className="text-lg font-bold">Outils</h2>
      <p className="mb-3 text-sm text-base-content/70">Pour explorer la langue au-delà de la lecture.</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {TOOLS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="rounded-box border border-base-300 bg-base-100 p-4 transition-colors hover:border-primary/40"
          >
            <span className="block font-semibold">{t.title}</span>
            <span className="mt-1 block text-sm text-base-content/70">{t.desc}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function preview(grec: string, words = 12): string {
  const parts = grec.split(/\s+/);
  return parts.length > words ? parts.slice(0, words).join(" ") + " …" : grec;
}

// Accès à un corpus. Le NT (primaire, bouton plein) domine ; la Septante vient en
// second (carte bordée). Les comptes sont dérivés de books.json.
function CorpusCta({
  href,
  title,
  subtitle,
  primary,
  className = "",
}: {
  href: string;
  title: string;
  subtitle: string;
  primary?: boolean;
  className?: string;
}) {
  const style = primary
    ? "bg-primary text-primary-content shadow-sm hover:bg-primary/90"
    : "border border-base-300 bg-base-200 hover:border-primary/40";
  return (
    <Link
      href={href}
      className={`flex items-center justify-between gap-3 rounded-box px-4 py-3.5 transition-colors ${style} ${className}`}
    >
      <span>
        <span className="block font-semibold">{title}</span>
        <span className={`block text-sm ${primary ? "text-primary-content/80" : "text-base-content/70"}`}>{subtitle}</span>
      </span>
      <span aria-hidden className="text-lg">→</span>
    </Link>
  );
}

const corpusSubtitle = (books: { chapters: number }[]) =>
  `${books.length} livres · ${books.reduce((a, b) => a + b.chapters, 0)} chapitres`;

function TextCard({ text, highlight }: { text: Text; highlight?: boolean }) {
  return (
    <Link
      href={`/text/${text.id}`}
      className={`card min-w-0 border bg-base-100 transition-colors hover:border-primary/40 ${
        highlight ? "border-primary/50 ring-1 ring-primary/20" : "border-base-300"
      }`}
    >
      <div className="card-body min-w-0 gap-1 p-3.5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="min-w-0 truncate text-[0.98rem] font-semibold">{text.reference}</h3>
          <span className={`badge badge-sm shrink-0 ${highlight ? "badge-primary" : "badge-ghost"}`}>
            {highlight ? "Commencer ici" : lengthLabel(text)}
          </span>
        </div>
        <p className="font-greek line-clamp-1 text-[0.95rem] text-base-content/55">
          {preview(text.grec, 9)}
        </p>
      </div>
    </Link>
  );
}

// Le parcours débutant : passages ordonnés par niveau (les plus accessibles
// d'abord), le premier marqué comme point d'entrée.
function Passages() {
  return (
    <>
      {collections.map((c, i) => {
        const list = textsByCollection(c.id);
        return (
          <section key={c.id} className={i === 0 ? "pt-11 wide:pt-16" : "pt-9"}>
            <h2 className="text-lg font-bold">{c.title}</h2>
            <p className="mb-3 text-sm text-base-content/70">{c.subtitle}</p>
            <div className="grid gap-3 wide:grid-cols-2">
              {list.map((t, idx) => (
                <TextCard key={t.id} text={t} highlight={idx === 0 && t.niveau === minNiveau(c.id)} />
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}

export default async function Home() {
  const [ntBooks, lxxBooks] = await Promise.all([loadBooksFs(NT), loadBooksFs(LXX)]);
  const ntSub = corpusSubtitle(ntBooks);
  const lxxSub = corpusSubtitle(lxxBooks);
  // Recherche de référence globale : NT et LXX fusionnés, chaque livre pointe vers
  // son corpus (les noms et ids ne se chevauchent pas entre les deux).
  const allBooks = [
    ...ntBooks.map((b) => ({ id: b.id, name: b.name, chapters: b.chapters, routePrefix: NT.routePrefix })),
    ...lxxBooks.map((b) => ({ id: b.id, name: b.name, chapters: b.chapters, routePrefix: LXX.routePrefix })),
  ];
  return (
    <div>
      {/* Pupitre : le poste de travail du lecteur récurrent, en tête - reprendre la
          lecture et aller directement à une référence (NT ou Septante). */}
      <section className="mt-4 rounded-box bg-primary px-4 py-4 text-primary-content wide:px-5">
        <p className="mb-2.5 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-primary-content/55">
          Votre pupitre
        </p>
        <div className="flex flex-col gap-2.5 wide:flex-row wide:items-center wide:gap-3">
          <ResumeReading />
          <div className="min-w-0 wide:flex-1">
            <RefJump books={allBooks} routePrefix={NT.routePrefix} />
          </div>
        </div>
      </section>

      {/* Héros éditorial : à gauche la promesse et les accès ; à droite un verset réel
          (Jean 1,1) en carte « essayez ici » qui mène à la lecture. */}
      <section className="mt-10 grid gap-8 wide:mt-14 wide:grid-cols-2 wide:items-center wide:gap-12">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">
            Nouveau Testament · Septante — texte intégral
          </p>
          <h1 className="mt-3 font-greek text-4xl leading-[1.1] wide:text-5xl">Lire la Bible en grec</h1>
          <IntroText className="mt-4 max-w-prose text-base leading-relaxed text-base-content/70" />
          <div className="mt-6 flex max-w-lg flex-col gap-2.5">
            <CorpusCta href="/nt" title="Nouveau Testament complet" subtitle={ntSub} primary />
            <CorpusCta href="/lxx" title="Septante, l’Ancien Testament grec" subtitle={lxxSub} />
          </div>
          <p className="mt-3 max-w-lg text-xs leading-relaxed text-base-content/70">
            La Septante est la traduction grecque de l’Ancien Testament, lue par les premiers chrétiens.
            Projet libre et indépendant, gratuit et sans publicité.
          </p>
        </div>

        <Link
          href="/nt/jn/1"
          className="group block overflow-hidden rounded-box border border-base-300 shadow-sm transition hover:shadow-md"
        >
          <div className="flex items-center justify-between bg-primary px-4 py-2.5 text-primary-content">
            <span className="text-sm font-medium">Jean 1 · verset 1</span>
            <span className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-primary-content/70">
              Essayez ici →
            </span>
          </div>
          <div className="bg-base-200 p-5 wide:p-6">
            <p className="font-greek text-2xl leading-relaxed wide:text-[1.7rem]">
              <sup className="mr-0.5 text-sm text-accent">1</sup>
              Ἐν ἀρχῇ ἦν ὁ{" "}
              <span className="underline decoration-accent decoration-2 underline-offset-4">λόγος</span>, καὶ ὁ
              λόγος ἦν πρὸς τὸν θεόν, καὶ θεὸς ἦν ὁ λόγος.
            </p>
            <p className="mt-4 flex flex-wrap items-center gap-2 text-sm text-base-content/70">
              Touchez une lettre soulignée, ou
              <span className="inline-flex items-center gap-1.5 rounded-full border border-base-300 bg-base-100 px-3 py-1 font-medium text-base-content">
                <span className="font-greek">λόγος</span> · le mot entier
              </span>
            </p>
          </div>
        </Link>
      </section>

      <Passages />

      {/* Image du scribe, descendue plus bas : affichée en entier (pas de crop),
          modeste et centrée, entre les passages et les outils. */}
      <div className="mt-11 wide:mt-16">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/scribe.jpg"
          alt={SCRIBE_ALT}
          className="mx-auto w-full max-w-2xl rounded-box"
          loading="lazy"
        />
      </div>

      <Tools />

      {/* Soutien : l'ask complet vit en bas de page (l'identité « projet libre et
          indépendant » est déjà rappelée dans le héros). data-nosnippet le garde hors
          du snippet Google. Le footer est rendu par le Shell (sitewide). */}
      <div className="pt-11 wide:pt-16">
        <SupportBanner />
      </div>
    </div>
  );
}
