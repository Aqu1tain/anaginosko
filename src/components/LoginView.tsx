"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../hooks/useAuth";
import { isLearner, startEmailLogin, verifyEmailLogin, type AuthUser } from "../lib/api";
import GoogleSignIn from "./GoogleSignIn";

// Adresse interne uniquement (jamais une URL externe passée en paramètre).
const safeNext = (value: string | null) => (value && /^\/(?!\/)[\w\-/%.?=&]*$/.test(value) ? value : null);
const homeOf = (user: AuthUser) => (isLearner(user) ? "/apprendre" : "/admin");

// Connexion et inscription sans mot de passe : un code à usage unique est envoyé
// par e-mail (le compte est créé au premier code), ou bien Google.
export default function LoginView() {
  const { user, signIn } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    const next = safeNext(new URLSearchParams(window.location.search).get("next"));
    router.replace(next ?? homeOf(user));
  }, [user, router]);

  const onSignedIn = useCallback((u: AuthUser) => signIn(u), [signIn]);

  if (user) return null;

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion impossible");
    }
    setBusy(false);
  };

  const sendCode = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      await startEmailLogin(email.trim());
      setStep("code");
    });
  };

  const checkCode = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => onSignedIn((await verifyEmailLogin(email.trim(), code.trim())).user));
  };

  return (
    <div className="mx-auto max-w-sm pt-12">
      <div className="rounded-3xl border border-base-300 bg-base-100 p-6 shadow-sm">
        <h1 className="text-center text-2xl font-bold">Se connecter ou créer un compte</h1>

        <div className="mt-6">
          <GoogleSignIn onSignedIn={onSignedIn} />
        </div>

        <div className="my-5 flex items-center gap-3 text-xs text-base-content/50">
          <span className="h-px flex-1 bg-base-300" />
          ou par e-mail
          <span className="h-px flex-1 bg-base-300" />
        </div>

        {step === "email" ? (
          <form onSubmit={sendCode} className="grid gap-3">
            <label className="block">
              <span className="text-sm font-medium">Adresse e-mail</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="vous@exemple.fr"
                className="input input-bordered mt-1 w-full"
                required
              />
            </label>
            {error && <p className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{error}</p>}
            <button type="submit" disabled={busy} className="btn btn-primary">
              {busy ? "Envoi…" : "Recevoir un code"}
            </button>
          </form>
        ) : (
          <form onSubmit={checkCode} className="grid gap-3">
            <p className="text-sm text-base-content/75">
              Un code à 6 chiffres vient d’être envoyé à <strong>{email}</strong>. Il est valable 10 minutes.
            </p>
            <label className="block">
              <span className="text-sm font-medium">Code reçu</span>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                className="input input-bordered mt-1 w-full text-center text-xl tracking-[0.4em] tabular-nums"
                autoFocus
                required
              />
            </label>
            {error && <p className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{error}</p>}
            <button type="submit" disabled={busy || code.length !== 6} className="btn btn-primary">
              {busy ? "Vérification…" : "Se connecter"}
            </button>
            <button type="button" onClick={() => setStep("email")} className="btn btn-ghost btn-sm">
              Changer d’adresse ou renvoyer un code
            </button>
          </form>
        )}

        <p className="mt-5 text-center text-xs text-base-content/55">
          En créant un compte, vous acceptez notre{" "}
          <a href="/confidentialite" className="link">politique de confidentialité</a>.
        </p>
      </div>
    </div>
  );
}
