import type { Metadata } from "next";
import LivresView from "@/src/components/admin/LivresView";

export const metadata: Metadata = {
  title: "Introductions de livres",
  robots: { index: false, follow: false },
};

export default function LivresPage() {
  return <LivresView />;
}
