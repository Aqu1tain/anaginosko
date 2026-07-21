import type { Metadata } from "next";
import InvitationView from "@/src/components/InvitationView";

export const metadata: Metadata = {
  title: "Invitation",
  robots: { index: false, follow: false },
};

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <InvitationView token={token} />;
}
