import type { Metadata } from "next";
import AccountView from "@/src/components/learn/AccountView";

export const metadata: Metadata = { title: "Mon compte", robots: { index: false, follow: false } };

export default function AccountPage() {
  return <AccountView />;
}
