import { ConcordanceExplorer, explorerMetadata } from "@/app/_corpus/ConcordanceExplorer";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export const generateMetadata = ({ searchParams }: Props) =>
  explorerMetadata(searchParams, "lxx", {
    title: "Concordance de la Septante",
    description:
      "Concordance de la Septante (LXX) : tous les lemmes grecs, à chercher en grec ou en translittération, à filtrer par nature et fréquence.",
    alternates: { canonical: "/lxx/concordance" },
  });

export default function LxxConcordancePage({ searchParams }: Props) {
  return <ConcordanceExplorer searchParams={searchParams} defaultCorpus="lxx" path="/lxx/concordance" title="Concordance de la Septante" />;
}
