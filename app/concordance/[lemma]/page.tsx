import { NT } from "@/src/data/corpus";
import { LemmaScreen, lemmaMetadata } from "@/app/_corpus/lemma";

// Rendu à la première visite puis mis en cache (ISR) : ~5 500 fiches lues depuis
// NT_DATA_DIR, trop nombreuses pour le build. Sans cache, chaque passage d'un robot
// recalculait la fiche.
export const revalidate = 86400;
export const dynamicParams = true;
export const generateStaticParams = async () => [];

type Params = { params: Promise<{ lemma: string }> };

export const generateMetadata = ({ params }: Params) => lemmaMetadata(NT, params);

export default function LemmaPage({ params }: Params) {
  return <LemmaScreen corpus={NT} params={params} />;
}
