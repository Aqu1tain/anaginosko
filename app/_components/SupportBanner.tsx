"use client";

import { useEffect, useState } from "react";
import { usePersistentState } from "../../src/hooks/usePersistentState";

const TIPEEE = "#d84759";

export default function SupportBanner() {
  const [dismissed, setDismissed] = usePersistentState("anaginosko:supportBanner", false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || dismissed) return null;

  return (
    <div
      role="region"
      aria-label="Soutenir le projet"
      className="card mt-4 border border-base-300 bg-base-200 wide:mt-6"
    >
      <div className="card-body relative gap-2 p-4 pr-11 wide:flex-row wide:items-center wide:gap-6 wide:pr-11">
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Fermer"
          className="btn btn-ghost btn-xs btn-circle absolute right-1.5 top-1.5"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <div className="min-w-0 wide:flex-1">
          <h3 className="text-base font-semibold">Un projet libre et indépendant</h3>
          <p className="mt-1 text-sm leading-relaxed text-base-content/85">
            Anaginosko est conçu par deux passionnés pour rendre le grec de la Bible
            accessible à tous. Notre but : rester gratuit, sans publicité, et devenir
            la meilleure concordance grecque en français. Votre soutien finance le
            développement et enrichit les annotations.
          </p>
        </div>

        <div className="card-actions mt-1 wide:mt-0 wide:shrink-0">
          <a
            href="https://fr.tipeee.com/anaginosko"
            target="_blank"
            rel="noreferrer noopener"
            className="btn btn-sm border bg-base-100"
            style={{ borderColor: `${TIPEEE}66`, color: "var(--tipeee-text)" }}
            aria-label="Nous soutenir sur Tipeee"
          >
            <span className="font-medium">Nous soutenir sur</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/tipeee.png" alt="Tipeee" className="h-4 w-auto" />
          </a>
        </div>
      </div>
    </div>
  );
}
