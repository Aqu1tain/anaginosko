import type { Metadata } from "next";
import Link from "next/link";
import { collections, lengthLabel, textsByCollection, type Text } from "../src/data/texts";
import SupportBanner from "./_components/SupportBanner";
import ResumeReading from "./_components/ResumeReading";

export const metadata: Metadata = {
  description:
    "Anaginosko : lire le grec koinè du Nouveau Testament, lettre par lettre. Prononciation érasmienne et restituée, alphabet interactif, concordance grecque et traduction française. Gratuit, sans publicité.",
  alternates: { canonical: "/" },
};

const INTRO =
  "Le Nouveau Testament, lettre par lettre. Touchez n’importe quelle lettre d’un texte pour découvrir son nom et sa prononciation, érasmienne et restituée.";
const SCRIBE_ALT = "Un scribe copiant l’Évangile sur un rouleau de papyrus";

function preview(grec: string, words = 12): string {
  const parts = grec.split(/\s+/);
  return parts.length > words ? parts.slice(0, words).join(" ") + " …" : grec;
}

// Accès principal au NT : bouton plein, couleur primaire — il doit dominer les
// cartes de passages et le bandeau « reprendre ».
function NtCta({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/nt"
      className={`flex items-center justify-between gap-3 rounded-box bg-primary px-4 py-3.5 text-primary-content shadow-sm transition-colors hover:bg-primary/90 ${className}`}
    >
      <span>
        <span className="block font-semibold">Nouveau Testament complet</span>
        <span className="block text-sm text-primary-content/80">27 livres · 260 chapitres</span>
      </span>
      <span aria-hidden className="text-lg">→</span>
    </Link>
  );
}

function TextCard({ text }: { text: Text }) {
  return (
    <Link
      href={`/text/${text.id}`}
      className="card min-w-0 border border-base-300 bg-base-100 transition-colors hover:border-primary/40"
    >
      <div className="card-body min-w-0 gap-2 p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="min-w-0 truncate text-[1.05rem] font-bold">{text.reference}</h3>
          <span className="badge badge-sm badge-ghost shrink-0">{lengthLabel(text)}</span>
        </div>
        <p className="font-greek line-clamp-1 border-t border-base-200 pt-2 text-lg text-base-content/70 wide:line-clamp-2">
          {preview(text.grec)}
        </p>
      </div>
    </Link>
  );
}

function Passages() {
  return (
    <>
      {collections.map((c, i) => (
        <section key={c.id} className={i === 0 ? "pt-8 wide:pt-10" : "pt-7"}>
          <h2 className="text-lg font-bold">{c.title}</h2>
          <p className="mb-3 text-sm text-base-content/70">{c.subtitle}</p>
          <div className="grid gap-2.5 wide:grid-cols-2">
            {textsByCollection(c.id).map((t) => (
              <TextCard key={t.id} text={t} />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

export default function Home() {
  return (
    <div>
      {/* Desktop : héros en deux temps — titre + intro + accès NT à gauche, image
          cadrée à droite. */}
      <section className="hidden pt-4 wide:grid wide:grid-cols-2 wide:items-stretch wide:gap-8">
        <div className="flex flex-col justify-center gap-5">
          <h1 className="font-greek text-5xl leading-[1.1]">Lire le grec koinè</h1>
          <p className="max-w-prose text-base leading-relaxed text-base-content/70">{INTRO}</p>
          <NtCta className="max-w-md" />
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
            Lire le grec koinè
          </h1>
        </div>
        <p className="mt-3 max-w-prose text-[0.95rem] leading-relaxed text-base-content/70">{INTRO}</p>
      </section>

      {/* Mobile : l'accès NT vient juste après l'intro (sur desktop il est dans le héros). */}
      <NtCta className="mt-4 wide:hidden" />

      {/* Reprise (pastille compacte) + soutien (bandeau pleine largeur). Aucun des
          deux ne réserve d'espace : si l'un manque (pas de lecture en cours, bandeau
          fermé), la mise en page reste propre. */}
      <ResumeReading />
      <SupportBanner />

      <Passages />

      <footer className="pt-10 text-center text-xs text-base-content/70">
        Texte grec : SBLGNT · traduction : Crampon · définitions : Bailly.
        <br />
        <Link href="/mentions" className="link mt-1 inline-block">
          Mentions légales
        </Link>
      </footer>
    </div>
  );
}
