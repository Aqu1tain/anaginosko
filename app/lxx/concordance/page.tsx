import ConcordanceView from "@/src/components/ConcordanceView";
import LemmaIndex from "@/app/_corpus/LemmaIndex";
import Breadcrumb from "@/app/_components/Breadcrumb";
import { LXX } from "@/src/data/corpus";

export const metadata = {
  title: "Concordance de la Septante",
  description:
    "Concordance de la Septante (LXX) : recherchez un lemme grec en grec ou en translittération latine (restituée ou érasmienne), avec définitions Bailly et occurrences.",
  alternates: { canonical: "/lxx/concordance" },
};

export default function LxxConcordancePage() {
  return (
    <>
      <Breadcrumb items={[{ label: "Accueil", href: "/", home: true }, { label: "Concordance de la Septante" }]} />
      <ConcordanceView corpus={LXX} />
      <LemmaIndex corpus={LXX} />
    </>
  );
}
