import type { Metadata } from "next";
import Link from "next/link";
import {
  lemmaEntryFs,
  loadBooksFs,
  loadCollocationsFs,
  loadDistributionFs,
  loadGlossFs,
  loadOccurrencesFs,
} from "@/lib/nt-server";
import LemmaDetail from "@/src/components/LemmaDetail";
import { NT, LXX } from "@/src/data/corpus";

// Rendu serveur à la demande. Les données NT sont lues depuis NT_DATA_DIR (en
// prod : le dossier servi par nginx, /var/www/anaginosko/nt), car elles ne sont
// pas embarquées dans le standalone Next. Pré-rendre les 5461 fiches gonflerait
// le bundle de centaines de Mo ; on garde donc le rendu dynamique.
export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lemma: string }>;
}): Promise<Metadata> {
  const { lemma } = await params;
  const l = decodeURIComponent(lemma);
  const entry = await lemmaEntryFs(l);
  const count = entry ? ` (${entry.count} occurrence${entry.count > 1 ? "s" : ""})` : "";
  return {
    title: `${l} · Concordance`,
    description: `Concordance de ${l} dans le Nouveau Testament${count} : répartition par livre, définition (Bailly) et occurrences.`,
    alternates: { canonical: `/concordance/${lemma}` },
  };
}

export default async function LemmaPage({ params }: { params: Promise<{ lemma: string }> }) {
  const { lemma } = await params;
  const l = decodeURIComponent(lemma);
  const entry = await lemmaEntryFs(l);

  if (!entry) {
    return (
      <div className="py-20 text-center text-base-content/70">
        <p className="font-greek text-xl">{l}</p>
        <p className="mt-2">Lemme introuvable.</p>
        <Link href="/concordance" className="link link-primary mt-3 inline-block">
          Toute la concordance
        </Link>
      </div>
    );
  }

  const [occ, dist, books, colloc, lxxEntry, lexicon] = await Promise.all([
    loadOccurrencesFs(entry.oid),
    loadDistributionFs(entry.oid),
    loadBooksFs(),
    loadCollocationsFs(entry.oid),
    lemmaEntryFs(l, LXX),
    loadGlossFs(l, NT),
  ]);

  // Vue croisee : si le lemme existe aussi dans la Septante, on charge ses donnees
  // pour la bascule NT / LXX / Les deux (la vie du mot sur toute la Bible grecque).
  const cross = lxxEntry
    ? await Promise.all([
        loadOccurrencesFs(lxxEntry.oid, LXX),
        loadDistributionFs(lxxEntry.oid, LXX),
        loadBooksFs(LXX),
        loadCollocationsFs(lxxEntry.oid, LXX),
      ]).then(([o, d, b, c]) => ({ entry: lxxEntry, occ: o, dist: d, books: b, colloc: c, corpus: LXX }))
    : undefined;

  // DefinedTerm : le lemme grec + sa définition Bailly (rendue serveur) comme
  // terme lexical d'un rich result potentiel. inLanguage grc.
  const definedTerm = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: l,
    inLanguage: "grc",
    url: `https://anaginosko.fr/concordance/${lemma}`,
    ...(lexicon.gloss?.excerpt ? { description: lexicon.gloss.excerpt } : {}),
    inDefinedTermSet: {
      "@type": "DefinedTermSet",
      name: "Concordance du Nouveau Testament",
      url: "https://anaginosko.fr/concordance",
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(definedTerm) }} />
      <LemmaDetail entry={entry} occ={occ} dist={dist} books={books} colloc={colloc} corpus={NT} cross={cross} lexicon={lexicon} />
    </>
  );
}
