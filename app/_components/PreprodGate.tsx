"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../../src/hooks/useAuth";

// Mur de connexion de la préproduction (next.anaginosko.fr). Actif seulement
// quand NEXT_PUBLIC_PREPROD=1 (build préprod) ; en prod, rend l'app telle quelle.
// L'auth étant par token localStorage, le filtrage est côté client : un visiteur
// anonyme voit l'écran de connexion ; seuls les contributeurs existants entrent.
const PREPROD = process.env.NEXT_PUBLIC_PREPROD === "1";
const ALLOWED = new Set(["admin", "philologist"]);

function Wall() {
  return (
    <div className="grid min-h-screen place-items-center p-6">
      <div className="card w-full max-w-sm border border-base-300 bg-base-100 shadow-sm">
        <div className="card-body items-center gap-3 text-center">
          <span className="badge badge-warning badge-soft">Préproduction</span>
          <h1 className="font-greek text-2xl">Anaginosko</h1>
          <p className="text-sm text-base-content/70">
            Environnement de test réservé aux contributeurs (Biblion, Admin). Connectez-vous pour continuer.
          </p>
          <Link href="/login" className="btn btn-primary btn-sm">
            Se connecter
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PreprodGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, ready } = useAuth();
  if (!PREPROD) return <>{children}</>;
  if (pathname === "/login") return <>{children}</>;
  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }
  if (user && ALLOWED.has(user.role)) return <>{children}</>;
  return <Wall />;
}
