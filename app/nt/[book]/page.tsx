import { BookScreen, bookStaticParams, bookMetadata } from "@/app/_corpus/screens";
import { NT } from "@/src/data/corpus";

export const dynamicParams = false;
export const generateStaticParams = () => bookStaticParams(NT);
export const generateMetadata = ({ params }: { params: Promise<{ book: string }> }) => bookMetadata(NT, params);

export default function NtBookPage({ params }: { params: Promise<{ book: string }> }) {
  return <BookScreen corpus={NT} params={params} />;
}
