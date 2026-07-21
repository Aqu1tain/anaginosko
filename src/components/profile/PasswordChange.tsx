"use client";

import { useState } from "react";
import { changePassword } from "@/src/lib/api";

// Changement de mot de passe par le titulaire du compte. Replié par défaut ;
// vérifie le mot de passe actuel côté serveur.
export default function PasswordChange() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (next.length < 8) return setError("Le nouveau mot de passe doit faire au moins 8 caractères.");
    if (next !== confirm) return setError("Les deux mots de passe ne correspondent pas.");
    setBusy(true);
    try {
      await changePassword(current, next);
      setCurrent("");
      setNext("");
      setConfirm("");
      setOpen(false);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Modification impossible");
    } finally {
      setBusy(false);
    }
  };

  if (!open)
    return (
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setDone(false);
          }}
          className="btn btn-outline btn-sm"
        >
          Changer le mot de passe
        </button>
        {done && <span className="text-sm text-success">Mot de passe modifié.</span>}
      </div>
    );

  return (
    <form onSubmit={submit} className="grid gap-2 sm:max-w-sm">
      <input
        type="password"
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        placeholder="Mot de passe actuel"
        autoComplete="current-password"
        className="input input-bordered w-full"
        required
      />
      <input
        type="password"
        value={next}
        onChange={(e) => setNext(e.target.value)}
        placeholder="Nouveau mot de passe"
        autoComplete="new-password"
        className="input input-bordered w-full"
        required
      />
      <input
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="Confirmer le nouveau mot de passe"
        autoComplete="new-password"
        className="input input-bordered w-full"
        required
      />
      {error && <p className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="btn btn-primary btn-sm">
          {busy ? "…" : "Enregistrer le mot de passe"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost btn-sm">
          Annuler
        </button>
      </div>
    </form>
  );
}
