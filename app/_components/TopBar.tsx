"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BOOK_NAMES } from "../../src/data/nt";
import { textById } from "../../src/data/texts";

function ThemeToggle({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-label={dark ? "Passer en clair" : "Passer en sombre"}
      aria-pressed={dark}
      className="btn btn-ghost btn-circle"
    >
      <svg className={`theme-icon ${dark ? "is-dark" : ""}`} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <mask id="theme-moon-mask">
          <rect x="0" y="0" width="24" height="24" fill="white" />
          <circle className="theme-cutout" cx="24" cy="3" r="6" fill="black" />
        </mask>
        <circle className="theme-core" cx="12" cy="12" r="5" fill="currentColor" mask="url(#theme-moon-mask)" />
        <g className="theme-rays" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
          <line x1="12" y1="1.5" x2="12" y2="3.8" />
          <line x1="12" y1="20.2" x2="12" y2="22.5" />
          <line x1="1.5" y1="12" x2="3.8" y2="12" />
          <line x1="20.2" y1="12" x2="22.5" y2="12" />
          <line x1="4.4" y1="4.4" x2="6" y2="6" />
          <line x1="18" y1="18" x2="19.6" y2="19.6" />
          <line x1="19.6" y1="4.4" x2="18" y2="6" />
          <line x1="6" y1="18" x2="4.4" y2="19.6" />
        </g>
      </svg>
    </button>
  );
}

// Titre + lien retour dérivés du chemin (la barre vit dans le layout, sans les
// données de page).
function chrome(pathname: string): { title: string | null; back: string; isLibrary: boolean } {
  const seg = pathname.split("/").filter(Boolean); // ["nt","jn","1"]
  if (pathname === "/") return { title: null, back: "/", isLibrary: true };
  if (seg[0] === "alphabet") return { title: "L’alphabet", back: "/", isLibrary: false };
  if (seg[0] === "concordance") return { title: "Concordance", back: "/", isLibrary: false };
  if (seg[0] === "mentions") return { title: "Mentions légales", back: "/", isLibrary: false };
  if (seg[0] === "login") return { title: "Connexion", back: "/", isLibrary: false };
  if (seg[0] === "admin") return { title: "Tableau de bord", back: "/", isLibrary: false };
  if (seg[0] === "text") {
    return { title: textById(seg[1])?.reference ?? "Texte", back: "/", isLibrary: false };
  }
  if (seg[0] === "nt") {
    if (seg.length === 1) return { title: "Nouveau Testament", back: "/", isLibrary: false };
    if (seg.length === 2) return { title: BOOK_NAMES[seg[1]] ?? "Livre", back: "/nt", isLibrary: false };
    return {
      title: `${BOOK_NAMES[seg[1]] ?? ""} ${seg[2]}`.trim(),
      back: `/nt/${seg[1]}`,
      isLibrary: false,
    };
  }
  return { title: null, back: "/", isLibrary: false };
}

export default function TopBar({ dark, onToggleTheme }: { dark: boolean; onToggleTheme: () => void }) {
  const pathname = usePathname();
  const { title, back, isLibrary } = chrome(pathname);

  return (
    <header className="sticky top-0 z-30 border-b border-base-300 bg-base-100/85 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="navbar mx-auto min-h-14 w-full max-w-2xl gap-1 px-2">
        <div className="flex min-w-0 flex-1 items-center gap-1">
          {isLibrary ? (
            <Link
              href="/"
              className="btn btn-ghost px-2 text-xl font-bold tracking-tight font-[family-name:var(--font-syne)]"
            >
              Anaginosko
            </Link>
          ) : (
            <>
              <Link href={back} aria-label="Retour" className="btn btn-ghost btn-circle">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              {title && <span className="truncate text-base font-semibold">{title}</span>}
            </>
          )}
        </div>

        <div className="flex items-center gap-1">
          <a
            href="https://fr.tipeee.com/anaginosko"
            target="_blank"
            rel="noreferrer noopener"
            aria-label="Soutenir le projet sur Tipeee"
            className="btn btn-ghost btn-sm gap-1.5 px-2 text-[#d84759]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/tipeee-icon.webp" alt="" aria-hidden="true" className="h-[18px] w-auto" />
            <span className="hidden font-semibold sm:inline">Soutenir</span>
          </a>
          <Link href="/login" aria-label="Espace contributeurs" className="btn btn-ghost btn-circle">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <circle cx="12" cy="8" r="4" />
              <path d="M12 13.5c-4 0-7.2 2.4-7.5 5.6A1 1 0 005.5 20.5h13a1 1 0 001-1.4c-.3-3.2-3.5-5.6-7.5-5.6z" />
            </svg>
          </Link>
          <ThemeToggle dark={dark} onToggle={onToggleTheme} />
        </div>
      </div>
    </header>
  );
}
