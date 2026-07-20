"use client";

import { useState } from "react";

// Partage d'un article : partage natif (mobile) si disponible, sinon copie du lien.
// Le lien affiche une carte OpenGraph riche (titre + auteur) grâce à opengraph-image.
export default function ShareArticle({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = location.href.split("#")[0];
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        /* partage annulé : on retombe sur la copie */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* presse-papiers indisponible */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      onClick={share}
      aria-label="Partager cet article"
      className="btn btn-ghost btn-sm gap-1.5 text-base-content/60 hover:text-primary"
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
      </svg>
      {copied ? "Lien copié" : "Partager"}
    </button>
  );
}
