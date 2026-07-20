import { lemmaOgImage } from "@/app/_og/lemmaImage";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Fiche-lemme · Anaginosko";
export const dynamic = "force-dynamic";

export default async function Image({ params }: { params: Promise<{ lemma: string }> }) {
  const { lemma } = await params;
  return lemmaOgImage("nt", lemma);
}
