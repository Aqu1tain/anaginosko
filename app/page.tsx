import type { Metadata } from "next";
import Link from "next/link";
import { collections, lengthLabel, minNiveau, textsByCollection, type Text } from "../src/data/texts";
import { loadBooksFs } from "../lib/nt-server";
import { NT, LXX } from "../src/data/corpus";
import SupportBanner from "./_components/SupportBanner";
import ResumeReading from "./_components/ResumeReading";

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

// Accès aux deux corpus + une phrase qui dit ce qu'est la Septante (jamais expliquée
// à un non-initié). Partagé entre le héros desktop et le bloc mobile.
function CorpusAccess({ ntSub, lxxSub, className = "" }: { ntSub: string; lxxSub: string; className?: string }) {
  return (
    <div className={`flex flex-col gap-2.5 ${className}`}>
      <CorpusCta href="/nt" title="Nouveau Testament complet" subtitle={ntSub} primary />
      <CorpusCta href="/lxx" title="Septante, l’Ancien Testament grec" subtitle={lxxSub} />
      <p className="text-xs leading-relaxed text-base-content/70">
        La Septante est la traduction grecque de l’Ancien Testament, lue par les premiers chrétiens.
      </p>
    </div>
  );
}

const TOOLS = [
  { href: "/alphabet", title: "Alphabet", desc: "Les 24 lettres : nom, tracé et prononciation." },
  { href: "/prononciation", title: "Prononciation", desc: "Érasmienne et restituée, comparées." },
  { href: "/concordance", title: "Concordance", desc: "Chercher un mot grec : sens, répartition, occurrences." },
];

function Tools() {
  return (
    <section className="pt-8 wide:pt-10">
      <h2 className="text-lg font-bold">Outils</h2>
      <p className="mb-3 text-sm text-base-content/70">Pour explorer la langue au-delà de la lecture.</p>
      <div className="grid gap-2.5 sm:grid-cols-3">
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
    : "border border-base-300 bg-base-100 hover:border-primary/40";
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
      <div className="card-body min-w-0 gap-2 p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="min-w-0 truncate text-[1.05rem] font-bold">{text.reference}</h3>
          <span className={`badge badge-sm shrink-0 ${highlight ? "badge-primary" : "badge-ghost"}`}>
            {highlight ? "Commencer ici" : lengthLabel(text)}
          </span>
        </div>
        <p className="font-greek line-clamp-1 border-t border-base-200 pt-2 text-lg text-base-content/70 wide:line-clamp-2">
          {preview(text.grec)}
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
          <section key={c.id} className={i === 0 ? "pt-8 wide:pt-10" : "pt-7"}>
            <h2 className="text-lg font-bold">{c.title}</h2>
            <p className="mb-3 text-sm text-base-content/70">{c.subtitle}</p>
            <div className="grid gap-2.5 wide:grid-cols-2">
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
  return (
    <div>
      {/* Desktop : héros en deux temps - titre + intro + accès NT à gauche, image
          cadrée à droite. */}
      <section className="hidden pt-4 wide:grid wide:grid-cols-2 wide:items-stretch wide:gap-8">
        <div className="flex flex-col justify-center gap-5">
          <h1 className="font-greek text-5xl leading-[1.1]">Lire la Bible en grec</h1>
          <IntroText className="max-w-prose text-base leading-relaxed text-base-content/70" />
          <CorpusAccess ntSub={ntSub} lxxSub={lxxSub} className="max-w-md" />
        </div>
        <div className="relative min-h-[22rem] overflow-hidden rounded-box">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/scribe.jpg"
            alt={SCRIBE_ALT}
            className="absolute inset-0 h-full w-full object-cover object-center"
            loading="eager"
          />
        </div>
      </section>

      {/* Mobile : image en bandeau avec titre incrusté (inchangé). */}
      <section className="pt-4 pb-2 wide:hidden">
        <div className="relative overflow-hidden rounded-box">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/scribe.jpg"
            alt={SCRIBE_ALT}
            className="h-48 w-full object-cover object-center sm:h-60"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <h1 className="font-greek absolute bottom-3 left-4 text-3xl text-white drop-shadow-md sm:text-4xl">
            Lire la Bible en grec
          </h1>
        </div>
        <IntroText className="mt-3 max-w-prose text-[0.95rem] leading-relaxed text-base-content/70" />
      </section>

      {/* Mobile : les accès aux corpus viennent juste après l'intro (dans le héros sur desktop). */}
      <CorpusAccess ntSub={ntSub} lxxSub={lxxSub} className="mt-4 wide:hidden" />

      {/* Reprise : action primaire du lecteur récurrent (la reprise vit ici, plus sur
          l'onglet de nav). Taille du contenu, ne réserve aucun espace si absente. */}
      <ResumeReading />

      {/* Identité « projet libre et indépendant » visible haut de page (data-nosnippet
          la retire du snippet Google). Puis le parcours : par où commencer, outils. */}
      <SupportBanner />

      <Passages />
      <Tools />

      <footer className="mt-12 border-t border-base-300 pt-8 pb-4 text-sm text-base-content/70">
        <nav aria-label="Liens du site" className="flex flex-wrap justify-center gap-x-5 gap-y-2">
          <Link href="/nt" className="link-hover">Nouveau Testament</Link>
          <Link href="/lxx" className="link-hover">Septante</Link>
          <Link href="/alphabet" className="link-hover">Alphabet</Link>
          <Link href="/prononciation" className="link-hover">Prononciation</Link>
          <Link href="/concordance" className="link-hover">Concordance</Link>
          <a href="https://fr.tipeee.com/anaginosko" target="_blank" rel="noreferrer noopener" className="link-hover">Soutenir</a>
          <Link href="/mentions" className="link-hover">Mentions légales</Link>
        </nav>
        <p className="mt-4 text-center text-xs">
          Texte grec : SBLGNT (NT) et Rahlfs (LXX) · traduction : Crampon (NT) et Giguet (LXX) · définitions : Bailly.
        </p>
      </footer>
    </div>
  );
}
