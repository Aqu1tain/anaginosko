"use client";

import { useEffect, useState } from "react";
import { fetchInvitation, acceptInvitation, type InvitableRole } from "../lib/api";

const ROLE_LABEL: Record<InvitableRole, string> = { admin: "administrateur", philologist: "philologue" };

type Invite = { email: string; displayName: string; role: InvitableRole };

export default function InvitationView({ token }: { token: string }) {
  const [invite, setInvite] = useState<Invite | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "invalid">("loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
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
          <a href="/" className="btn btn-outline btn-sm mt-4 border-base-300">Aller à la lecture</a>
        </div>
      </div>
    );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Le mot de passe doit faire au moins 8 caractères.");
    if (password !== confirm) return setError("Les deux mots de passe ne correspondent pas.");
    setBusy(true);
    try {
      await acceptInvitation(token, password);
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
          Vous rejoignez Anaginosko comme {ROLE_LABEL[invite.role]}. Choisissez un mot de passe pour activer votre accès.
        </p>
        <form onSubmit={submit} className="mt-6 grid gap-3">
          <label className="block">
            <span className="text-sm font-medium">Mot de passe</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="input input-bordered mt-1 w-full"
              required
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Confirmer le mot de passe</span>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              className="input input-bordered mt-1 w-full"
              required
            />
          </label>
          {error && <p className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{error}</p>}
          <button type="submit" disabled={busy} className="btn btn-primary mt-1">
            {busy ? "Activation…" : "Activer mon compte"}
          </button>
        </form>
      </div>
    </div>
  );
}
