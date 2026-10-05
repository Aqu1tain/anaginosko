import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LecturesView from "../_components/LecturesView";
import { riteBySlug, todayInParis } from "@/lib/lectionnaire";

export const revalidate = 300;
export const generateStaticParams = async () => [];

type Props = { params: Promise<{ rite: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const rite = riteBySlug((await params).rite);
  if (!rite) return {};
  return {
    title: `Lectures du jour en grec, ${rite.label.toLowerCase()}`,
    description: `Les lectures du jour en grec selon la ${rite.label.toLowerCase()}, avec la traduction française en regard.`,
    alternates: { canonical: `/lectures/${rite.slug}` },
  };
}

export default async function Page({ params }: Props) {
  const rite = riteBySlug((await params).rite);
  if (!rite) notFound();
  return <LecturesView rite={rite} iso={todayInParis()} />;
}
