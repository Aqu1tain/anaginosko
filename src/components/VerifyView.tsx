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
    <div className="grid min-h-[60vh] place-items-center p-6">
      <div className="card w-full max-w-sm border border-base-300 bg-base-100 shadow-sm">
        <div className="card-body items-center gap-3 text-center">
          <h1 className="text-xl font-semibold">Confirmer votre signalement</h1>

          {!token ? (
            <p className="text-sm text-error">Lien incomplet : aucun jeton fourni.</p>
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
              <p className="text-sm text-base-content/80">{message}</p>
            </>
          ) : (
            <>
              <p className="text-sm text-base-content/70">
                Cliquez pour valider le signalement que vous venez d’envoyer.
              </p>
              <button
                onClick={confirm}
                disabled={state === "loading"}
                className="btn btn-primary btn-sm mt-1"
              >
                {state === "loading" ? "Confirmation…" : "Confirmer mon signalement"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
