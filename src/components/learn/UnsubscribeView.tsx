"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { unsubscribe } from "../../lib/api";

// Lien de désinscription des e-mails : effectif dès l'ouverture de la page.
export default function UnsubscribeView({ token }: { token: string }) {
  const [state, setState] = useState<"pending" | "done" | "error">(token ? "pending" : "error");

  useEffect(() => {
    if (!token) return;
    unsubscribe(token)
      .then(() => setState("done"))
      .catch(() => setState("error"));
  }, [token]);

  return (
    <div className="mx-auto max-w-sm pb-12 pt-12 text-center">
      <h1 className="text-3xl font-bold tracking-tight">
        {state === "done" ? "Désinscription confirmée" : state === "pending" ? "Désinscription…" : "Lien invalide"}
      </h1>
      {state === "done" && <p className="mt-2 text-base-content/80">Vous ne recevrez plus nos e-mails.</p>}
      {state === "error" && <p className="mt-2 text-base-content/80">Gérez vos e-mails dans les Paramètres.</p>}
      <Link href="/mon-compte" className="btn btn-outline btn-sm mt-6">Paramètres</Link>
    </div>
  );
}
