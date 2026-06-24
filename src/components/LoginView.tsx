import { useState } from "react";
import { useAuth } from "../hooks/useAuth";

export default function LoginView() {
  const { user, login, logout } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) {
    return (
      <div className="pt-8">
        <h1 className="text-2xl font-bold">Connecté</h1>
        <p className="mt-2 text-base-content/75">
          <span className="font-greek">{user.displayName}</span> ·{" "}
          {user.role === "admin" ? "Administrateur" : "Philologue"}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {user.role === "admin" && (
            <a href="#/admin" className="btn btn-primary btn-sm">
              Tableau de bord
            </a>
          )}
          <a href="#/" className="btn btn-outline btn-sm border-base-300">
            Aller à la lecture
          </a>
          <button onClick={() => logout()} className="btn btn-ghost btn-sm">
            Se déconnecter
          </button>
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
    <div className="mx-auto max-w-sm pt-10">
      <h1 className="text-2xl font-bold">Connexion</h1>
      <p className="mt-1 text-sm text-base-content/70">Espace contributeurs (admin, philologue).</p>
      <form onSubmit={submit} className="mt-5 grid gap-3">
        <label className="block">
          <span className="text-sm font-medium">Identifiant</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
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
        {error && <p className="text-sm text-error">{error}</p>}
        <button type="submit" disabled={busy} className="btn btn-primary">
          {busy ? "Connexion…" : "Se connecter"}
        </button>
      </form>
    </div>
  );
}
