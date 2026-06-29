import { ChapterScreen, chapterStaticParams, chapterMetadata } from "@/app/_corpus/screens";
import { LXX } from "@/src/data/corpus";

export const dynamicParams = false;
export const generateStaticParams = () => chapterStaticParams(LXX);
export const generateMetadata = ({ params }: { params: Promise<{ book: string; chapter: string }> }) =>
  chapterMetadata(LXX, params);

export default function LxxChapterPage({ params }: { params: Promise<{ book: string; chapter: string }> }) {
  return <ChapterScreen corpus={LXX} params={params} />;
}
