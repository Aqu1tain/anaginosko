"use client";

import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import type { Role } from "../lib/api";

const ROLE_LABEL: Record<Role, string> = { admin: "Administrateur", philologist: "Philologue", reader: "Lecteur" };
const ROLE_BADGE: Record<Role, string> = { admin: "badge-primary", philologist: "badge-accent", reader: "badge-ghost" };

function RoleBadge({ role }: { role: Role }) {
  return <span className={`badge badge-sm ${ROLE_BADGE[role]} badge-soft`}>{ROLE_LABEL[role]}</span>;
}

export default function LoginView() {
  const { user, login, logout } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) {
    return (
      <div className="mx-auto max-w-sm pt-12">
        <div className="rounded-3xl border border-base-300 bg-base-100 p-6 text-center shadow-sm">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary/10 font-greek text-2xl text-primary">
            {user.displayName.slice(0, 2)}
          </div>
          <h1 className="mt-3 font-greek text-2xl font-bold">{user.displayName}</h1>
          <div className="mt-1 flex justify-center">
            <RoleBadge role={user.role} />
          </div>
          <div className="mt-6 grid gap-2">
            <a href="/admin" className="btn btn-primary">
              Tableau de bord
            </a>
            <a href="/" className="btn btn-outline border-base-300">
              Aller à la lecture
            </a>
            <button onClick={() => logout()} className="btn btn-ghost btn-sm text-base-content/70">
              Se déconnecter
            </button>
          </div>
        </div>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion impossible");
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm pt-12">
      <div className="rounded-3xl border border-base-300 bg-base-100 p-6 shadow-sm">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="12" cy="8" r="4" />
            <path d="M12 13.5c-4 0-7.2 2.4-7.5 5.6A1 1 0 005.5 20.5h13a1 1 0 001-1.4c-.3-3.2-3.5-5.6-7.5-5.6z" />
          </svg>
        </div>
        <h1 className="mt-3 text-center text-2xl font-bold">Espace contributeurs</h1>
        <p className="mt-1 text-center text-sm text-base-content/70">
          Réservé à l’administration et aux philologues, pour rédiger et gérer les
          annotations savantes. La lecture reste libre, sans compte.
        </p>

        <form onSubmit={submit} className="mt-6 grid gap-3">
          <label className="block">
            <span className="text-sm font-medium">Identifiant</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              placeholder="vous@anaginosko.fr"
              className="input input-bordered mt-1 w-full"
              required
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Mot de passe</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="input input-bordered mt-1 w-full"
              required
            />
          </label>
          {error && (
            <p className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{error}</p>
          )}
          <button type="submit" disabled={busy} className="btn btn-primary mt-1">
            {busy ? "Connexion…" : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}
