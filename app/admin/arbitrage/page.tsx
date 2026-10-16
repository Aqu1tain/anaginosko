import { Suspense } from "react";
import type { Metadata } from "next";
import WorkshopView from "@/src/components/workshop/WorkshopView";

export const metadata: Metadata = { title: "Atelier de traduction", robots: { index: false, follow: false } };

export default function ArbitragePage() {
  return (
    <Suspense>
      <WorkshopView />
    </Suspense>
  );
}
