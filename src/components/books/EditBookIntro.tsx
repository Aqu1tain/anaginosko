"use client";

import Link from "next/link";
import { useAuth } from "@/src/hooks/useAuth";
import { can } from "@/src/lib/api";

// Bouton discret « Éditer l'introduction » sur une page de livre : visible seulement
// pour les éditeurs (permission review), mène à l'éditeur admin.
export default function EditBookIntro({ corpus, book }: { corpus: string; book: string }) {
  const { user } = useAuth();
  if (!can(user, "review")) return null;
  return (
    <Link
      href={`/admin/livres/${corpus}/${book}`}
      className="btn btn-ghost btn-xs gap-1.5 text-base-content/60 hover:text-primary"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />
      </svg>
      Éditer l'introduction
    </Link>
  );
}
