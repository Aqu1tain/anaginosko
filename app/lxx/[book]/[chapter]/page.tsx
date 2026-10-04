import { ChapterScreen, chapterMetadata } from "@/app/_corpus/screens";
import { LXX } from "@/src/data/corpus";

// ISR à la demande, rien n'est pré-rendu au build : la première requête lit le fr.json
// vivant de LXX_DATA_DIR, jamais l'état git. Une correction Biblion invalide la page
// par revalidatePath ; revalidate rattrape toute écriture faite hors de l'application.
export const revalidate = 3600;
export const generateStaticParams = async () => [];
export const generateMetadata = ({ params }: { params: Promise<{ book: string; chapter: string }> }) =>
  chapterMetadata(LXX, params);

export default function LxxChapterPage({ params }: { params: Promise<{ book: string; chapter: string }> }) {
  return <ChapterScreen corpus={LXX} params={params} />;
}
