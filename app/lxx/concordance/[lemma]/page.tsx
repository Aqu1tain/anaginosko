import { LXX } from "@/src/data/corpus";
import { LemmaScreen, lemmaMetadata } from "@/app/_corpus/lemma";

// Rendu à la première visite puis mis en cache (ISR) : ~14 000 fiches lues depuis
// LXX_DATA_DIR, trop nombreuses pour le build.
export const revalidate = 86400;
export const dynamicParams = true;
export const generateStaticParams = async () => [];

type Params = { params: Promise<{ lemma: string }> };

export const generateMetadata = ({ params }: Params) => lemmaMetadata(LXX, params);

export default function LxxLemmaPage({ params }: Params) {
  return <LemmaScreen corpus={LXX} params={params} />;
}
