import type { Metadata } from "next";
import Link from "next/link";
import { collections, lengthLabel, textsByCollection, type Text } from "../src/data/texts";
import SupportBanner from "./_components/SupportBanner";

export const metadata: Metadata = { alternates: { canonical: "/" } };

function preview(grec: string, words = 7): string {
  const parts = grec.split(/\s+/);
  return parts.length > words ? parts.slice(0, words).join(" ") + " …" : grec;
}

function TextCard({ text }: { text: Text }) {
  return (
    <Link
      href={`/text/${text.id}`}
      className="card min-w-0 border border-base-300 bg-base-100 transition-colors hover:border-primary/40"
    >
      <div className="card-body min-w-0 gap-1.5 p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="min-w-0 truncate font-semibold">{text.reference}</h3>
          <span className="badge badge-sm badge-ghost shrink-0">{lengthLabel(text)}</span>
        </div>
        <p className="font-greek truncate text-lg text-base-content/75">{preview(text.grec)}</p>
      </div>
    </Link>
  );
}

export default function Home() {
  return (
    <div>
      <section className="pt-4 pb-2">
        <div className="relative overflow-hidden rounded-box">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/scribe.jpg"
            alt="Un scribe copiant l’Évangile sur un rouleau de papyrus"
            className="h-48 w-full object-cover object-center sm:h-60"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <h1 className="font-greek absolute bottom-3 left-4 text-3xl text-white drop-shadow-md sm:text-4xl">
            Lire le grec koinè
          </h1>
        </div>
        <p className="mt-3 max-w-prose text-[0.95rem] leading-relaxed text-base-content/70">
          Le Nouveau Testament, lettre par lettre. Touchez n’importe quelle lettre
          d’un texte pour découvrir son nom et sa prononciation, érasmienne et
          restituée.
        </p>
        <SupportBanner />

        <Link
          href="/nt"
          className="mt-4 flex items-center justify-between gap-3 rounded-box border border-base-300 bg-base-100 px-4 py-3 transition-colors hover:border-primary/40"
        >
          <span>
            <span className="block font-semibold">Nouveau Testament complet</span>
            <span className="block text-sm text-base-content/70">27 livres · 260 chapitres</span>
          </span>
          <span className="text-primary">→</span>
        </Link>
      </section>

      {collections.map((c) => (
        <section key={c.id} className="pt-7">
          <h2 className="text-lg font-bold">{c.title}</h2>
          <p className="mb-3 text-sm text-base-content/70">{c.subtitle}</p>
          <div className="grid gap-2.5">
            {textsByCollection(c.id).map((t) => (
              <TextCard key={t.id} text={t} />
            ))}
          </div>
        </section>
      ))}

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
