"use client";

import Link from "next/link";
import { useAuth } from "../../hooks/useAuth";

// Invitation à créer un compte, masquée une fois connecté.
export default function SignupCta({ next = "/apprendre" }: { next?: string }) {
  const { user, ready } = useAuth();
  if (!ready || user) return null;
  return (
    <section className="flex flex-col gap-4 rounded-box bg-base-200 px-5 py-6 wide:flex-row wide:items-center wide:justify-between wide:px-8">
      <div>
        <h2 className="text-lg font-semibold">Un compte gratuit pour suivre les cours</h2>
        <p className="mt-1 max-w-[56ch] text-sm text-base-content/70">
          Les leçons et votre progression sont réservées aux comptes. Pas de mot de passe : un code par e-mail ou Google suffit.
        </p>
      </div>
      <Link href={`/login?next=${encodeURIComponent(next)}`} className="btn btn-primary shrink-0 rounded-full px-6">
        Créer un compte
      </Link>
    </section>
  );
}
