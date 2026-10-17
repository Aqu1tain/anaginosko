import { Suspense } from "react";
import IAnaginoskoView from "@/src/components/ianaginosko/IAnaginoskoView";

export const metadata = { title: "IAnaginosko", robots: { index: false } };

export default function IAnaginoskoPage() {
  return (
    <Suspense>
      <IAnaginoskoView />
    </Suspense>
  );
}
