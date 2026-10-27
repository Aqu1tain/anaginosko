"use client";

import { useEffect, useRef, useState } from "react";
import { fetchAuthProviders, googleLogin, type AuthUser } from "../lib/api";

type GoogleId = {
  initialize: (o: { client_id: string; callback: (r: { credential: string }) => void; ux_mode?: string }) => void;
  renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
};
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

const SCRIPT = "https://accounts.google.com/gsi/client";

function loadScript(): Promise<void> {
  if (window.google?.accounts) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT}"]`);
    const s = existing ?? Object.assign(document.createElement("script"), { src: SCRIPT, async: true });
    s.addEventListener("load", () => resolve());
    s.addEventListener("error", () => reject(new Error("Google indisponible")));
    if (!existing) document.head.appendChild(s);
  });
}

// Bouton « Continuer avec Google » (Google Identity Services). Absent tant que
// l'API n'a pas d'identifiant client Google configuré.
export default function GoogleSignIn({
  onSignedIn,
  newsletter,
}: {
  onSignedIn: (user: AuthUser, created: boolean) => void;
  newsletter: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  // Lu au moment du rappel Google : la case peut changer après l'initialisation.
  const optIn = useRef(newsletter);
  useEffect(() => {
    optIn.current = newsletter;
  }, [newsletter]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAuthProviders().then((p) => setClientId(p.googleClientId));
  }, []);

  useEffect(() => {
    if (!clientId || !box.current) return;
    const el = box.current;
    loadScript()
      .then(() => {
        const id = window.google!.accounts.id;
        id.initialize({
          client_id: clientId,
          callback: ({ credential }) =>
            googleLogin(credential, optIn.current)
              .then((s) => onSignedIn(s.user, s.created))
              .catch((e: Error) => setError(e.message)),
        });
        id.renderButton(el, { theme: "outline", size: "large", shape: "pill", text: "continue_with", locale: "fr", width: el.clientWidth || 320 });
      })
      .catch((e: Error) => setError(e.message));
  }, [clientId, onSignedIn]);

  if (!clientId) return <div className="mt-6" />;
  return (
    <div className="mt-6">
      <div ref={box} className="flex min-h-11 justify-center" />
      {error && <p className="mt-2 text-center text-sm text-error">{error}</p>}
      <div className="my-5 flex items-center gap-3 text-xs text-base-content/70">
        <span className="h-px flex-1 bg-base-300" />
        ou par e-mail
        <span className="h-px flex-1 bg-base-300" />
      </div>
    </div>
  );
}
