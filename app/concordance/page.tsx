import { ConcordanceExplorer, explorerMetadata } from "@/app/_corpus/ConcordanceExplorer";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export const generateMetadata = ({ searchParams }: Props) =>
  explorerMetadata(searchParams, "all", {
    title: "Concordance",
    description:
      "Concordance de la Bible grecque, Nouveau Testament et Septante : les 15 000 lemmes grecs, à chercher en grec ou en translittération, à filtrer par nature et fréquence.",
    alternates: { canonical: "/concordance" },
  });

export default function ConcordancePage({ searchParams }: Props) {
  return <ConcordanceExplorer searchParams={searchParams} defaultCorpus="all" path="/concordance" title="Concordance" />;
}
