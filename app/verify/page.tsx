import { Suspense } from "react";
import VerifyView from "../../src/components/VerifyView";

export const metadata = {
  title: "Confirmer un signalement",
  description: "Validez le signalement que vous avez envoyé sur Anaginosko.",
  robots: { index: false, follow: false },
};

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyView />
    </Suspense>
  );
}
