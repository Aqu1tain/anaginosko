import { ChapterScreen, chapterMetadata } from "@/app/_corpus/screens";
import { LXX } from "@/src/data/corpus";

// RENDU À LA DEMANDE (et non SSG). La LXX est en cours d'arbitrage : son fr.json
// change en dehors du build (matérialisation git+serveur au déploiement, écriture
// chirurgicale d'applyToReader quand Biblion arbitre). Un pré-rendu au build figerait
// la traduction à l'état git du moment — le travail serveur de Biblion n'apparaîtrait
// JAMAIS, et revalidatePath ne peut pas le corriger (le service ne peut pas écrire le
// cache .next de la release, possédé par le CI). On rend donc chaque requête depuis le
// fr.json VIVANT lu sur LXX_DATA_DIR. Le NT (pas d'arbitrage vivant) reste SSG.
export const dynamic = "force-dynamic";
export const generateMetadata = ({ params }: { params: Promise<{ book: string; chapter: string }> }) =>
  chapterMetadata(LXX, params);

export default function LxxChapterPage({ params }: { params: Promise<{ book: string; chapter: string }> }) {
  return <ChapterScreen corpus={LXX} params={params} />;
}
