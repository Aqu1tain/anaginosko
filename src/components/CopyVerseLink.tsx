"use client";

import { useState } from "react";

// Copie le lien profond d'un verset (URL + #v{n}) dans le presse-papiers, met à jour
// l'ancre de la page, et donne un retour bref. Discret : apparaît au survol sur
// desktop, reste faiblement visible sinon (mobile).
export default function CopyVerseLink({ v }: { v: number }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const url = `${location.origin}${location.pathname}#v${v}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* presse-papiers indisponible : on met au moins l'ancre à jour */
    }
    history.replaceState(null, "", `#v${v}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copier le lien du verset ${v}`}
      title={copied ? "Lien copié" : "Copier le lien du verset"}
      className="btn btn-ghost btn-sm btn-circle text-base-content/50 opacity-70 transition hover:text-primary hover:opacity-100 focus-visible:opacity-100 wide:opacity-0 wide:group-hover:opacity-100"
    >
      {copied ? (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      ) : (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5" />
          <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5" />
        </svg>
      )}
    </button>
  );
}
