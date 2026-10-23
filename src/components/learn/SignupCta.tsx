"use client";

import Link from "next/link";
import { useAuth } from "../../hooks/useAuth";

// Invitation à créer un compte, masquée une fois connecté.
export default function SignupCta({ next = "/apprendre" }: { next?: string }) {
  const { user, ready } = useAuth();
  if (!ready || user) return null;
  return (
    <section className="flex flex-col gap-4 rounded-box bg-base-200 p-6 wide:flex-row wide:items-center wide:justify-between wide:px-8">
      <h2 className="text-lg font-semibold">Suivez les cours et votre progression.</h2>
      <Link href={`/login?next=${encodeURIComponent(next)}`} className="btn btn-primary btn-sm shrink-0">
        Créer un compte
      </Link>
    </section>
  );
}
