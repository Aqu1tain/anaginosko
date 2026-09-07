import MentionsView from "../../src/components/MentionsView";

export const metadata = {
  title: "Mentions légales",
  description: "Éditeur, hébergeur, sources, droits et licences des contenus d’Anaginosko.",
  alternates: { canonical: "/mentions" },
};

export default function MentionsPage() {
  return <MentionsView />;
}
