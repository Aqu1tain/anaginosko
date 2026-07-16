import ConcordanceView from "@/src/components/ConcordanceView";
import LemmaIndex from "@/app/_corpus/LemmaIndex";
import Breadcrumb from "@/app/_components/Breadcrumb";
import { NT } from "@/src/data/corpus";

export const metadata = {
  title: "Concordance",
  description:
    "Concordance du Nouveau Testament : recherchez un lemme grec en grec ou en translittération latine (restituée ou érasmienne), avec définitions Bailly et occurrences.",
  alternates: { canonical: "/concordance" },
};

export default function ConcordancePage() {
  return (
    <>
      <Breadcrumb items={[{ label: "Accueil", href: "/", home: true }, { label: "Concordance" }]} />
      <ConcordanceView corpus={NT} />
      <LemmaIndex corpus={NT} />
    </>
  );
}
