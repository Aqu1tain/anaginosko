import { textById } from "@/src/data/texts";
import { passageCard } from "@/app/_og/cards";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Texte grec · Anaginosko";
export const dynamic = "force-dynamic";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = textById(id);
  return passageCard({
    refLabel: t?.reference ?? "Anaginosko",
    corpusLabel: "Lecture",
    greek: null,
  });
}
