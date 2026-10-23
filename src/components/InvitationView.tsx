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

  if (state === "loading") return <div className="py-12 text-center text-sm text-base-content/50">Chargement…</div>;

  if (state === "invalid" || !invite)
    return (
      <div className="mx-auto max-w-sm pb-12 pt-12 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Invitation invalide</h1>
        <p className="mt-2 text-sm text-base-content/70">
          Lien expiré ou invalide. Demandez une nouvelle invitation.
        </p>
        <Link href="/" className="btn btn-outline btn-sm mt-6">Retour à l’accueil</Link>
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
    <div className="mx-auto max-w-sm pb-12 pt-12">
      <h1 className="text-center text-3xl font-bold tracking-tight">Bienvenue, {invite.displayName}</h1>
      <p className="mt-2 text-center text-sm text-base-content/70">
        Vous rejoignez Anaginosko comme {invite.title}.
      </p>
      <form onSubmit={submit} className="mt-6 flex flex-col items-center gap-3">
        {error && <p className="text-sm text-error">{error}</p>}
        <button type="submit" disabled={busy} className="btn btn-primary btn-sm">
          {busy ? "Activation…" : "Activer mon compte"}
        </button>
      </form>
    </div>
  );
}
