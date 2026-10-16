import { notFound, permanentRedirect } from "next/navigation";
import { PASSAGE_TO_NT } from "@/src/data/passageLink";
import { textById } from "@/src/data/texts";

// Les anciens « passages » d'accueil renvoient à leur chapitre du Nouveau Testament.
export const dynamicParams = false;
export const generateStaticParams = async () => Object.keys(PASSAGE_TO_NT).map((id) => ({ id }));

export default async function TextPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const nt = PASSAGE_TO_NT[id];
  if (!nt) notFound();
  const verse = textById(id)?.reference.match(/:(\d+)/)?.[1];
  permanentRedirect(`/nt/${nt.book}/${nt.chapter}${verse && verse !== "1" ? `#v${verse}` : ""}`);
}
