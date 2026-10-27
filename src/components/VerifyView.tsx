"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { verifyReport } from "../lib/api";

type State = "idle" | "loading" | "success" | "error";

export default function VerifyView() {
  const token = useSearchParams().get("token") ?? "";
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");

  // Confirmation par action explicite (jamais au chargement) : évite qu'un
  // scanner d'e-mail (prefetch, antivirus) consomme le token à usage unique.
  const confirm = async () => {
    setState("loading");
    try {
      const res = await verifyReport(token);
      setMessage(res.message);
      setState("success");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Lien invalide ou expiré.");
      setState("error");
    }
  };

  return (
    <div className="mx-auto max-w-sm pb-12 pt-12">
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Confirmer votre signalement</h1>

        {!token ? (
          <p className="text-sm text-error">Lien incomplet. Ouvrez le lien reçu par e-mail.</p>
        ) : state === "success" ? (
          <>
            <span className="badge badge-success badge-soft">Confirmé</span>
            <p className="text-sm text-base-content/80">{message}</p>
            <Link href="/" className="btn btn-primary btn-sm mt-1">
              Retour à l’accueil
            </Link>
          </>
        ) : state === "error" ? (
          <>
            <span className="badge badge-error badge-soft">Échec</span>
            <p className="text-sm text-error">{message}</p>
          </>
        ) : (
          <>
            <button
              onClick={confirm}
              disabled={state === "loading"}
              className="btn btn-primary btn-sm mt-1"
            >
              {state === "loading" ? "Confirmation…" : "Confirmer"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
