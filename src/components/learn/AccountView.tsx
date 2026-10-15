"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { deleteMe, fetchMe, isLearner, updateMe } from "../../lib/api";
import { useProgress } from "../../hooks/useProgress";

// Compte d'un apprenant : nom, adresse de connexion, progression, déconnexion et
// suppression. Les comptes de l'équipe gèrent le leur depuis le tableau de bord.
export default function AccountView() {
  const { user, ready, signIn, logout } = useAuth();
  const { done } = useProgress();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [newsletter, setNewsletter] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setName(user.displayName);
    fetchMe()
      .then((me) => {
        setEmail(me.email ?? "");
        setNewsletter(!!me.newsletter);
      })
      .catch(() => {});
  }, [user]);

  if (!ready) return null;
  if (!user)
    return (
      <div className="py-16 text-center">
        <p className="text-base-content/70">Connectez-vous pour voir votre compte.</p>
        <Link href="/login?next=/mon-compte" className="btn btn-primary mt-4 rounded-full">Se connecter</Link>
      </div>
    );

  const rename = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      signIn(await updateMe({ displayName: name.trim() }));
      setMessage("Nom enregistré.");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const toggleNewsletter = async (value: boolean) => {
    setError(null);
    try {
      await updateMe({ newsletter: value });
      setNewsletter(value);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const remove = async () => {
    if (!window.confirm("Supprimer définitivement votre compte et votre progression ?")) return;
    try {
      await deleteMe();
      await logout();
      router.push("/");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="mx-auto max-w-xl pb-10 pt-6">
      <h1 className="text-3xl font-bold">Mon compte</h1>

      <section className="mt-6 rounded-box border border-base-300 bg-base-100 p-5">
        <h2 className="font-semibold">Votre progression</h2>
        <p className="mt-1 text-sm text-base-content/70">
          {done.size === 0 ? "Aucune leçon terminée pour l’instant." : `${done.size} leçon${done.size > 1 ? "s" : ""} terminée${done.size > 1 ? "s" : ""}.`}
        </p>
        <Link href="/apprendre" className="btn btn-primary btn-sm mt-3 rounded-full">Aller aux cours</Link>
      </section>

      <form onSubmit={rename} className="mt-4 rounded-box border border-base-300 bg-base-100 p-5">
        <h2 className="font-semibold">Identité</h2>
        <label className="mt-3 block">
          <span className="text-sm font-medium">Nom affiché</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className="input input-bordered mt-1 w-full" required />
        </label>
        <p className="mt-3 text-sm">
          <span className="text-base-content/65">Adresse de connexion : </span>
          {email || "…"}
        </p>
        <button type="submit" className="btn btn-outline btn-sm mt-4 border-base-300">Enregistrer</button>
        {message && <span className="ml-3 text-sm text-success">{message}</span>}
      </form>

      <section className="mt-4 rounded-box border border-base-300 bg-base-100 p-5">
        <h2 className="font-semibold">E-mails</h2>
        <label className="mt-3 flex cursor-pointer items-start gap-3 text-sm">
          <input type="checkbox" className="toggle toggle-sm toggle-primary mt-0.5" checked={newsletter} onChange={(e) => toggleNewsletter(e.target.checked)} />
          <span>Recevoir les nouveautés par e-mail</span>
        </label>
      </section>

      {error && <p className="mt-4 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{error}</p>}

      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={async () => { await logout(); router.push("/"); }} className="btn btn-ghost btn-sm">
          Se déconnecter
        </button>
        {isLearner(user) ? (
          <button type="button" onClick={remove} className="btn btn-ghost btn-sm text-error">Supprimer mon compte</button>
        ) : (
          <Link href="/admin" className="btn btn-ghost btn-sm">Tableau de bord</Link>
        )}
      </div>
    </div>
  );
}
