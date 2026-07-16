import { ChapterScreen, chapterStaticParams, chapterMetadata } from "@/app/_corpus/screens";
import { NT } from "@/src/data/corpus";

export const dynamicParams = false;
export const generateStaticParams = () => chapterStaticParams(NT);
export const generateMetadata = ({ params }: { params: Promise<{ book: string; chapter: string }> }) =>
  chapterMetadata(NT, params);

export default function NtChapterPage({ params }: { params: Promise<{ book: string; chapter: string }> }) {
  return <ChapterScreen corpus={NT} params={params} />;
}
