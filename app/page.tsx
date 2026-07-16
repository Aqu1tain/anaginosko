import type { Metadata } from "next";
import Link from "next/link";
import { collections, verseCount, minNiveau, textsByCollection, type Text } from "../src/data/texts";
import { loadBooksFs, loadChapterFs } from "../lib/nt-server";
import { NT, LXX } from "../src/data/corpus";
import SupportBanner from "./_components/SupportBanner";
import ResumeReading from "./_components/ResumeReading";
import RefJump from "../src/components/RefJump";
import HeroVerse from "../src/components/HeroVerse";

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

// Accroche française d'un passage : 1er verset traduit (Crampon), tronqué. Sert de
// mini-description pour les recommandations « guidées ». null si pas de traduction.
function frenchIncipit(text: Text, max = 110): string | null {
  const fr = text.francais;
  if (!fr) return null;
  const first = Object.values(fr).find((s) => s?.trim());
  if (!first) return null;
  const clean = first.trim();
  return clean.length > max ? clean.slice(0, max).trimEnd() + "…" : clean;
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

function TextCard({
  text,
  highlight,
  guided,
}: {
  text: Text;
  highlight?: boolean;
  // guided : recommandation mise en avant → affiche une accroche française.
  guided?: boolean;
}) {
  const incipit = guided ? frenchIncipit(text) : null;
  return (
    <Link
      href={`/text/${text.id}`}
      className={`card min-w-0 border bg-base-100 transition-colors hover:border-primary/40 ${
        highlight ? "border-primary/50 ring-1 ring-primary/20" : "border-base-300"
      }`}
    >
      <div className="card-body min-w-0 gap-1 p-3.5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 text-[0.98rem] font-semibold leading-snug [overflow-wrap:anywhere]">
            {text.reference}
          </h3>
          <span className="badge badge-sm badge-ghost shrink-0 tabular-nums">
            {verseCount(text)} versets
          </span>
        </div>
        {incipit && (
          <p className="mt-0.5 line-clamp-2 text-[0.85rem] leading-snug text-base-content/70">{incipit}</p>
        )}
        <p className="font-greek line-clamp-1 text-[0.95rem] text-base-content/55">
          {preview(text.grec, 9)}
        </p>
      </div>
    </Link>
  );
}

// Le parcours débutant : trois recommandations guidées (les plus accessibles),
// le reste replié derrière « Voir tous les passages ». La 1re est le point d'entrée.
function Passages() {
  const c = collections[0];
  if (!c) return null;
  const list = textsByCollection(c.id);
  const featured = list.slice(0, 3);
  const rest = list.slice(3);
  const min = minNiveau(c.id);
  return (
    <section className="pt-11 wide:pt-16">
      <h2 className="text-lg font-bold">{c.title}</h2>
      <p className="mb-3 text-sm text-base-content/70">{c.subtitle}</p>
      <div className="grid gap-3 wide:grid-cols-2">
        {featured.map((t, idx) => (
          <TextCard key={t.id} text={t} highlight={idx === 0 && t.niveau === min} guided />
        ))}
      </div>
      {rest.length > 0 && (
        <details className="group mt-3">
          <summary className="btn btn-ghost btn-sm w-full justify-center border border-base-300 font-medium">
            <span className="group-open:hidden">Voir tous les passages ({rest.length} de plus)</span>
            <span className="hidden group-open:inline">Réduire</span>
          </summary>
          <div className="mt-3 grid gap-3 wide:grid-cols-2">
            {rest.map((t) => (
              <TextCard key={t.id} text={t} />
            ))}
          </div>
        </details>
      )}
    </section>
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
  // Verset vitrine (Jean 1,1) : chargé côté serveur, réduit au 1er verset (charge
  // légère), rendu interactif par HeroVerse via le SheetContext global.
  const jn1 = await loadChapterFs("jn", 1, NT);
  const heroVerse: Text = { ...jn1, francais: null, mots: (jn1.mots ?? []).filter((m) => m.verse === 1) };
  return (
    <div>
      {/* SEO : le héros (H1 + promesse) vient EN PREMIER dans le DOM/source. Le bandeau
          de soutien est remonté VISUELLEMENT au-dessus via `order`, sans passer avant
          le contenu principal pour Google (+ data-nosnippet côté banner). */}
      <div className="flex flex-col">
        {/* Héros éditorial : la promesse et les accès. À droite, un verset réel
            (Jean 1,1) interactif. */}
        <section className="order-2 mt-8 grid gap-8 wide:mt-10 wide:grid-cols-2 wide:items-center wide:gap-12">
          <div>
          <h1 className="font-greek text-4xl leading-[1.1] wide:text-5xl">Lire la Bible en grec</h1>
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

        <HeroVerse text={heroVerse} />
        </section>

        {/* Bandeau de soutien : remonté visuellement en tête (order-1) mais placé
            APRÈS le héros dans le DOM (SEO). Fermable ; data-nosnippet le sort du snippet. */}
        <div className="order-1 pt-2">
          <SupportBanner />
        </div>
      </div>

      {/* Pupitre : le poste de travail du lecteur récurrent, sous la promesse -
          reprendre la lecture et aller directement à une référence (NT ou Septante). */}
      <section className="mt-10 rounded-box bg-primary px-4 py-4 text-primary-content wide:mt-12 wide:px-5">
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

      <Passages />

      {/* Illustration du scribe, contextualisée par une légende : elle relie la
          lecture au geste de transmission manuscrite plutôt que d'interrompre. */}
      <figure className="mt-11 wide:mt-16">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/scribe.jpg"
          alt={SCRIBE_ALT}
          width={1376}
          height={768}
          className="mx-auto w-full max-w-xl rounded-box"
          loading="lazy"
        />
        <figcaption className="mx-auto mt-2 max-w-xl text-center text-xs text-base-content/60">
          Chaque texte que vous lisez ici nous est parvenu par des siècles de copie
          patiente, lettre après lettre. C’est ce même geste que propose Anaginosko.
        </figcaption>
      </figure>

      <Tools />
      {/* Le footer est rendu par le Shell (sitewide). */}
    </div>
  );
}
