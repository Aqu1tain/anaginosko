import MentionsView from "../../src/components/MentionsView";

export const metadata = {
  title: "Mentions légales",
  description: "Sources et licences d'Anaginosko (SBLGNT, MorphGNT, Crampon, Bailly, Azure Speech).",
  alternates: { canonical: "/mentions" },
};

export default function MentionsPage() {
  return <MentionsView />;
}
