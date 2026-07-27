import { BookScreen, bookMetadata } from "@/app/_corpus/screens";
import { NT } from "@/src/data/corpus";

// RENDU À LA DEMANDE (et non SSG). L'intro éditoriale d'un livre change hors build
// (édition/publication admin au runtime). Un pré-rendu SSG la figerait, et
// revalidatePath sur une route `dynamicParams=false` lève NoFallbackError -> 404.
// On rend donc chaque requête en lisant l'intro vivante, comme /nt/[book]/[chapter].
export const dynamic = "force-dynamic";
export const generateMetadata = ({ params }: { params: Promise<{ book: string }> }) => bookMetadata(NT, params);

export default function NtBookPage({ params }: { params: Promise<{ book: string }> }) {
  return <BookScreen corpus={NT} params={params} />;
}
