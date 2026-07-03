import { ChapterScreen, chapterStaticParams, chapterMetadata } from "@/app/_corpus/screens";
import { LXX } from "@/src/data/corpus";

// dynamicParams=true (et non false) : les chapitres sont pré-rendus au build,
// mais la route reste régénérable à la demande. Indispensable pour que
// revalidatePath (appelé quand Biblion arbitre) refabrique la page depuis le
// fr.json frais ; avec false, la revalidation sort la page du manifeste et
// renvoie 404 (NoFallbackError). Les URLs invalides restent gérées par le
// notFound() de ChapterScreen.
export const dynamicParams = true;
export const generateStaticParams = () => chapterStaticParams(LXX);
export const generateMetadata = ({ params }: { params: Promise<{ book: string; chapter: string }> }) =>
  chapterMetadata(LXX, params);

export default function LxxChapterPage({ params }: { params: Promise<{ book: string; chapter: string }> }) {
  return <ChapterScreen corpus={LXX} params={params} />;
}
