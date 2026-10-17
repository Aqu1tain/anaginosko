"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../../src/hooks/useAuth";
import Avatar from "../../src/components/profile/Avatar";
import { isLearner } from "../../src/lib/api";

const item = "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-base-200";

function Icon({ d }: { d: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-base-content/60">
      <path d={d} />
    </svg>
  );
}

const SETTINGS = "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z";
const DASHBOARD = "M4 13h6V4H4zM14 20h6V11h-6zM4 20h6v-3H4zM14 7h6V4h-6z";
const LOGOUT = "M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3M10 17l5-5-5-5M15 12H4";

// Avatar de la barre du haut : connexion, ou menu du compte (paramètres, tableau
// de bord pour l'équipe, déconnexion).
export default function AccountMenu() {
  const { user, photo, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  if (!user)
    return (
      <Link href="/login" aria-label="Se connecter" className="btn btn-ghost btn-circle">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="8" r="4" />
          <path d="M12 13.5c-4 0-7.2 2.4-7.5 5.6A1 1 0 005.5 20.5h13a1 1 0 001-1.4c-.3-3.2-3.5-5.6-7.5-5.6z" />
        </svg>
      </Link>
    );

  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open} aria-label="Compte" className="btn btn-ghost btn-circle">
        <Avatar name={user.displayName} photo={photo} size={26} />
      </button>
      {open && (
        <div role="menu" className="absolute top-full right-0 z-40 mt-2 w-64 rounded-box border border-base-300 bg-base-100 p-1.5 shadow-lg">
          <div className="flex items-center gap-3 px-3 py-2.5">
            <Avatar name={user.displayName} photo={photo} size={34} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user.displayName}</p>
              {user.email && <p className="truncate text-xs text-base-content/55">{user.email}</p>}
            </div>
          </div>
          <div className="my-1 border-t border-base-300" />
          <Link role="menuitem" href="/mon-compte" className={item}>
            <Icon d={SETTINGS} />
            Paramètres
          </Link>
          {!isLearner(user) && (
            <Link role="menuitem" href="/admin" className={item}>
              <Icon d={DASHBOARD} />
              Tableau de bord
            </Link>
          )}
          <div className="my-1 border-t border-base-300" />
          <button
            role="menuitem"
            type="button"
            className={item}
            onClick={async () => {
              setOpen(false);
              await logout();
              router.push("/");
            }}
          >
            <Icon d={LOGOUT} />
            Se déconnecter
          </button>
        </div>
      )}
    </div>
  );
}
