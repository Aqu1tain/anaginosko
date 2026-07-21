import type { Metadata } from "next";
import ComptesView from "@/src/components/admin/ComptesView";

export const metadata: Metadata = {
  title: "Comptes",
  robots: { index: false, follow: false },
};

export default function ComptesPage() {
  return <ComptesView />;
}
