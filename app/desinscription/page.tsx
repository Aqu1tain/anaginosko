import type { Metadata } from "next";
import UnsubscribeView from "@/src/components/learn/UnsubscribeView";

export const metadata: Metadata = { title: "Désinscription", robots: { index: false, follow: false } };

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  return <UnsubscribeView token={(await searchParams).token ?? ""} />;
}
