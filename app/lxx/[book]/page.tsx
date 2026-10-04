import { BookScreen, bookMetadata } from "@/app/_corpus/screens";
import { LXX } from "@/src/data/corpus";

// ISR à la demande : l'intro éditoriale change au runtime et sa publication invalide
// la page par revalidatePath. Rien n'est pré-rendu, l'intro n'est jamais figée au build.
export const revalidate = 3600;
export const generateStaticParams = async () => [];
export const generateMetadata = ({ params }: { params: Promise<{ book: string }> }) => bookMetadata(LXX, params);

export default function LxxBookPage({ params }: { params: Promise<{ book: string }> }) {
  return <BookScreen corpus={LXX} params={params} />;
}
