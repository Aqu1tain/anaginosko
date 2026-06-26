import ConcordanceView from "@/src/components/ConcordanceView";

export const metadata = {
  title: "Concordance",
  description:
    "Concordance du Nouveau Testament : recherchez un lemme grec en grec ou en translittération latine (restituée ou érasmienne), avec définitions Bailly et occurrences.",
  alternates: { canonical: "/concordance" },
};

export default function ConcordancePage() {
  return <ConcordanceView />;
}
