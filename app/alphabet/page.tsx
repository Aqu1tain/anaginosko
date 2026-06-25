import AlphabetView from "@/src/components/AlphabetView";

export const metadata = {
  title: "L’alphabet grec",
  description:
    "L’alphabet grec koinè : nom, tracé, prononciation érasmienne et restituée de chaque lettre, diphtongues, esprits et accents.",
  alternates: { canonical: "/alphabet" },
};

export default function AlphabetPage() {
  return <AlphabetView />;
}
