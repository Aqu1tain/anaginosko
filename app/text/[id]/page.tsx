import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { texts, textById, type Text } from "@/src/data/texts";
import Reader from "@/src/components/Reader";
import Breadcrumb from "@/app/_components/Breadcrumb";
import BreadcrumbJsonLd from "@/app/_components/BreadcrumbJsonLd";

export const dynamicParams = false;

export async function generateStaticParams() {
  return texts.map((t) => ({ id: t.id }));
}

// Traduction française (Crampon) ordonnée par verset, en un texte continu.
function frenchOrdered(text: Text): string {
  if (!text.francais) return "";
  return Object.keys(text.francais)
    .map(Number)
    .sort((a, b) => a - b)
    .map((v) => text.francais![String(v)])
    .join(" ")
    .trim();
}

// Première(s) phrase(s), coupées sur une frontière de phrase sous `max`.
function firstSentences(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  return stop > 40 ? cut.slice(0, stop + 1) : cut.replace(/\s+\S*$/, "") + "…";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const t = textById(id);
  if (!t) return { title: "Texte" };
  // Description = 1re phrase française du passage (snippet lisible pour un
  // francophone), plutôt qu'un gabarit répété affichant du grec brut.
  const fr = frenchOrdered(t);
  const lead = `${t.reference}, grec koinè : `;
  const description = fr ? lead + firstSentences(fr, 158 - lead.length) : `${t.reference} : grec koinè, translittération et traduction.`;
  return {
    title: t.reference,
    description,
    alternates: { canonical: `/text/${id}` },
    openGraph: { type: "article", locale: "fr_FR", title: t.reference, description },
  };
}

export default async function TextPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const text = textById(id);
  if (!text) notFound();

  // Le lecteur interactif rend le grec côté client ; on double le passage en
  // texte continu serveur (grec + français par verset) pour les moteurs et les
  // lecteurs d'écran, comme les pages chapitre. Versification incompatible
  // (frenchBlock) : le français est rendu en bloc plutôt qu'apparié.
  const verseGreek = new Map<number, string[]>();
  for (const m of text.mots ?? []) {
    if (m.verse == null) continue;
    if (!verseGreek.has(m.verse)) verseGreek.set(m.verse, []);
    verseGreek.get(m.verse)!.push(m.grec);
  }
  const greekVerseNums = [...verseGreek.keys()].sort((a, b) => a - b);
  const aligned = !text.frenchBlock && !!text.francais;
  const verses = greekVerseNums.length
    ? greekVerseNums.map((v) => ({
        v,
        grec: verseGreek.get(v)!.join(" "),
        fr: aligned ? (text.francais?.[String(v)] ?? null) : null,
      }))
    : [{ v: 0, grec: text.grec, fr: null }];
  const frenchBlockText =
    (text.frenchBlock || !greekVerseNums.length) && text.francais ? frenchOrdered(text) : null;

  return (
    <div className="reading-page">
      <BreadcrumbJsonLd items={[{ name: "Accueil", path: "/" }, { name: text.reference, path: `/text/${id}` }]} />
      <div className="reading-col">
        <Breadcrumb items={[{ label: "Accueil", href: "/", home: true }, { label: text.reference }]} />
      </div>
      <Reader text={text} />

      <section className="sr-only" aria-label={`${text.reference}, texte continu`}>
        {verses.map((vs) => (
          <p key={vs.v}>
            <span lang="grc">
              {vs.v ? `${vs.v} ` : ""}
              {vs.grec}
            </span>
            {vs.fr ? <span lang="fr"> : {vs.fr}</span> : null}
          </p>
        ))}
        {frenchBlockText ? <p lang="fr">{frenchBlockText}</p> : null}
      </section>
    </div>
  );
}
