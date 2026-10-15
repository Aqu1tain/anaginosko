"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchInvitation, acceptInvitation } from "../lib/api";

type Invite = { email: string; displayName: string; title: string };

export default function InvitationView({ token }: { token: string }) {
  const [invite, setInvite] = useState<Invite | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "invalid">("loading");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchInvitation(token)
      .then((i) => {
        setInvite(i);
        setState("ready");
      })
      .catch(() => setState("invalid"));
  }, [token]);

  if (state === "loading") return <div className="py-20 text-center text-base-content/60">Chargement…</div>;

  if (state === "invalid" || !invite)
    return (
      <div className="mx-auto max-w-sm pt-12">
        <div className="rounded-3xl border border-base-300 bg-base-100 p-6 text-center shadow-sm">
          <h1 className="text-xl font-bold">Invitation invalide</h1>
          <p className="mt-2 text-sm text-base-content/70">
            Ce lien est invalide ou a expiré. Demandez une nouvelle invitation à l’administration.
          </p>
          <Link href="/" className="btn btn-outline btn-sm mt-4 border-base-300">Aller à la lecture</Link>
        </div>
      </div>
    );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await acceptInvitation(token);
      // Navigation complète : l'état d'authentification se réinitialise avec le
      // nouveau jeton (le contributeur arrive connecté sur son tableau de bord).
      window.location.href = "/admin";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Activation impossible");
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm pt-12">
      <div className="rounded-3xl border border-base-300 bg-base-100 p-6 shadow-sm">
        <h1 className="text-center text-2xl font-bold">Bienvenue, {invite.displayName}</h1>
        <p className="mt-2 text-center text-sm text-base-content/70">
          Vous rejoignez Anaginosko comme {invite.title}. Aucun mot de passe : vous vous connecterez
          ensuite avec un code envoyé à {invite.email}, ou avec Google.
        </p>
        <form onSubmit={submit} className="mt-6 grid gap-3">
          {error && <p className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{error}</p>}
          <button type="submit" disabled={busy} className="btn btn-primary mt-1">
            {busy ? "Activation…" : "Activer mon compte"}
          </button>
        </form>
      </div>
    </div>
  );
}
