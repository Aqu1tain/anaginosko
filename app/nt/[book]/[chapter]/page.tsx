import { ChapterScreen, chapterMetadata } from "@/app/_corpus/screens";
import { NT } from "@/src/data/corpus";

// ISR à la demande, comme la LXX : les traductions maison (ARB_DIR) changent hors
// build et invalident la page par revalidatePath ; rien n'est figé à l'état git.
export const revalidate = 3600;
export const generateStaticParams = async () => [];
export const generateMetadata = ({ params }: { params: Promise<{ book: string; chapter: string }> }) =>
  chapterMetadata(NT, params);

export default function NtChapterPage({ params }: { params: Promise<{ book: string; chapter: string }> }) {
  return <ChapterScreen corpus={NT} params={params} />;
}
