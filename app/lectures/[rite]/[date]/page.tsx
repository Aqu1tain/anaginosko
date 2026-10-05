import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LecturesView from "../../_components/LecturesView";
import { formatLongDate, isIsoDate, loadDay, riteBySlug, riteRange } from "@/lib/lectionnaire";

export const revalidate = 86400;
export const generateStaticParams = async () => [];

type Props = { params: Promise<{ rite: string; date: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { rite: slug, date } = await params;
  const rite = riteBySlug(slug);
  if (!rite || !isIsoDate(date)) return {};
  const day = await loadDay(rite, date);
  const when = formatLongDate(date).toLowerCase();
  return {
    title: `Lectures du ${when}, ${rite.label.toLowerCase()}`,
    description: `Les lectures du ${when}${day ? ` (${day.title})` : ""} en grec, avec la traduction française en regard.`,
    alternates: { canonical: `/lectures/${rite.slug}/${date}` },
  };
}

export default async function Page({ params }: Props) {
  const { rite: slug, date } = await params;
  const rite = riteBySlug(slug);
  if (!rite || !isIsoDate(date)) notFound();
  const range = await riteRange(rite);
  if (!range || date < range.first || date > range.last) notFound();
  return <LecturesView rite={rite} iso={date} />;
}
