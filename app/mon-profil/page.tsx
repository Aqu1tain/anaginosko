import type { Metadata } from "next";
import ProfileEditor from "@/src/components/profile/ProfileEditor";

export const metadata: Metadata = { title: "Mon profil · Anaginosko", robots: { index: false, follow: false } };

export default function MonProfilPage() {
  return <ProfileEditor />;
}
