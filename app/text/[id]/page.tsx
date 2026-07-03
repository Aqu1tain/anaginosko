import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { texts, textById } from "@/src/data/texts";
import Reader from "@/src/components/Reader";
import Breadcrumb from "@/app/_components/Breadcrumb";
import BreadcrumbJsonLd from "@/app/_components/BreadcrumbJsonLd";

export const dynamicParams = false;

export async function generateStaticParams() {
  return texts.map((t) => ({ id: t.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const t = textById(id);
  if (!t) return { title: "Texte" };
  return {
    title: t.reference,
    description: `${t.reference} : grec koinè, translittération et traduction.`,
    alternates: { canonical: `/text/${id}` },
    openGraph: { type: "article", locale: "fr_FR", title: t.reference },
  };
}

export default async function TextPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const text = textById(id);
  if (!text) notFound();
  return (
    <div className="reading-page">
      <BreadcrumbJsonLd items={[{ name: "Accueil", path: "/" }, { name: text.reference, path: `/text/${id}` }]} />
      <div className="reading-col">
        <Breadcrumb items={[{ label: "Accueil", href: "/", home: true }, { label: text.reference }]} />
      </div>
      <Reader text={text} />
    </div>
  );
}
