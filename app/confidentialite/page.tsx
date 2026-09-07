import PrivacyView from "../../src/components/PrivacyView";

export const metadata = {
  title: "Politique de confidentialité",
  description: "Traitements de données personnelles, mesure d’audience et droits des utilisateurs d’Anaginosko.",
  alternates: { canonical: "/confidentialite" },
};

export default function PrivacyPage() {
  return <PrivacyView />;
}
