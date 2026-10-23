"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { can, deleteMe, fetchMe, isLearner, updateMe } from "../../lib/api";
import AssistantSettings from "../workshop/assistant/AssistantSettings";
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

  const assisted = can(user, "ai");
  const sections = [
    ["progression", "Progression"],
    ["identite", "Identité"],
    ["emails", "E-mails"],
    ...(assisted ? [["assistant", "Assistant IA"]] : []),
    ["compte", "Compte"],
  ];
  const signOut = async () => {
    await logout();
    router.push("/");
  };

  return (
    <div className="pb-12 pt-6">
      <h1 className="text-3xl font-bold tracking-tight">Paramètres</h1>
      <div className="mt-8 wide:grid wide:grid-cols-[11rem_minmax(0,48rem)] wide:gap-12">
        <nav aria-label="Sections" className="hidden wide:block">
          <ul className="sticky top-20 space-y-0.5 text-sm">
            {sections.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className="block rounded-field px-3 py-1.5 text-base-content/65 hover:bg-base-200 hover:text-base-content">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-12">
          <section id="progression" className="scroll-mt-20">
            <h2 className="text-lg font-semibold">Progression</h2>
            <p className="mt-1 text-sm text-base-content/70">
              {done.size === 0 ? "Aucune leçon terminée." : `${done.size} leçon${done.size > 1 ? "s" : ""} terminée${done.size > 1 ? "s" : ""}.`}
            </p>
            <Link href="/apprendre" className="btn btn-outline btn-sm mt-3">Aller aux cours</Link>
          </section>

          <form id="identite" onSubmit={rename} className="scroll-mt-20">
            <h2 className="text-lg font-semibold">Identité</h2>
            <label className="mt-4 block max-w-md">
              <span className="text-sm font-medium">Nom affiché</span>
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className="input input-bordered mt-1 w-full" required />
            </label>
            <p className="mt-3 text-sm">
              <span className="text-base-content/60">Adresse de connexion : </span>
              {email || "…"}
            </p>
            {name.trim() !== user.displayName && (
              <button type="submit" className="btn btn-primary btn-sm mt-4">Enregistrer</button>
            )}
            {message && <p className="mt-3 text-sm text-success">{message}</p>}
          </form>

          <section id="emails" className="scroll-mt-20">
            <h2 className="text-lg font-semibold">E-mails</h2>
            <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm">
              <input type="checkbox" className="toggle toggle-sm toggle-primary mt-0.5" checked={newsletter} onChange={(e) => toggleNewsletter(e.target.checked)} />
              <span>Recevoir les nouveautés par e-mail</span>
            </label>
          </section>

          {assisted && (
            <section id="assistant" className="scroll-mt-20">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                Assistant IA <span className="badge badge-sm badge-outline font-normal">Bêta</span>
              </h2>
              <div className="mt-4">
                <AssistantSettings />
              </div>
            </section>
          )}

          <section id="compte" className="scroll-mt-20">
            <h2 className="text-lg font-semibold">Compte</h2>
            {error && <p className="mt-3 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{error}</p>}
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" onClick={signOut} className="btn btn-outline btn-sm">
                Se déconnecter
              </button>
              {isLearner(user) && (
                <button type="button" onClick={remove} className="btn btn-ghost btn-sm text-error">
                  Supprimer mon compte
                </button>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
