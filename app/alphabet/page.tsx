import AlphabetView from "@/src/components/AlphabetView";
import Breadcrumb from "@/app/_components/Breadcrumb";
import BreadcrumbJsonLd from "@/app/_components/BreadcrumbJsonLd";
import { letters } from "@/src/data/alphabet";

export const metadata = {
  title: "L’alphabet grec",
  description:
    "L’alphabet grec koinè : nom, tracé, prononciation érasmienne et restituée de chaque lettre, diphtongues, esprits et accents.",
  alternates: { canonical: "/alphabet" },
};

// DefinedTermSet : les 24 lettres comme jeu de termes définis (nom, tracé,
// prononciations). Adossé au contenu visible rendu par AlphabetView.
const termSet = {
  "@context": "https://schema.org",
  "@type": "DefinedTermSet",
  name: "L’alphabet grec koinè",
  url: "https://anaginosko.fr/alphabet",
  inLanguage: "grc",
  hasDefinedTerm: letters.map((l) => ({
    "@type": "DefinedTerm",
    name: l.name,
    termCode: `${l.upper}${l.lower}`,
    description: `Prononciation érasmienne « ${l.erasmien} », restituée « ${l.restituee} ».`,
    inLanguage: "grc",
  })),
};

export default function AlphabetPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(termSet) }} />
      <BreadcrumbJsonLd items={[{ name: "Accueil", path: "/" }, { name: "L’alphabet grec", path: "/alphabet" }]} />
      <div className="mx-auto max-w-2xl">
        <Breadcrumb items={[{ label: "Accueil", href: "/", home: true }, { label: "L’alphabet grec" }]} />
        <AlphabetView />
      </div>
    </>
  );
}
