import { BookScreen, bookStaticParams, bookMetadata } from "@/app/_corpus/screens";
import { LXX } from "@/src/data/corpus";

export const dynamicParams = false;
export const generateStaticParams = () => bookStaticParams(LXX);
export const generateMetadata = ({ params }: { params: Promise<{ book: string }> }) => bookMetadata(LXX, params);

export default function LxxBookPage({ params }: { params: Promise<{ book: string }> }) {
  return <BookScreen corpus={LXX} params={params} />;
}
