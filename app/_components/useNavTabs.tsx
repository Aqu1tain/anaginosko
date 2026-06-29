"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getLastRead } from "../../src/lib/lastRead";
import { CORPORA } from "../../src/data/corpus";

const ICONS = {
  read: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 5.5A1.5 1.5 0 015.5 4H11v15H5.5A1.5 1.5 0 014 17.5v-12zM20 5.5A1.5 1.5 0 0018.5 4H13v15h5.5a1.5 1.5 0 001.5-1.5v-12z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  ),
  alphabet: <span className="font-greek text-[1.15rem] leading-none">Αα</span>,
  concordance: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M16 16l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
};

export type NavTab = { href: string; label: string; icon: React.ReactNode; active: boolean };

// Onglets de navigation, partagés par la barre du bas (mobile) et le rail
// latéral (desktop). « Lire » ramène là où on a quitté la section lecture.
export function useNavTabs(): NavTab[] {
  const pathname = usePathname();
  const isConcordance = /\/concordance(\/|$)/.test(pathname);
  const reading =
    !isConcordance &&
    (pathname === "/" || pathname.startsWith("/text") || CORPORA.some((c) => pathname.startsWith(c.routePrefix)));

  const [readHref, setReadHref] = useState("/");
  useEffect(() => {
    const last = getLastRead();
    if (last?.href) setReadHref(last.href);
  }, []);
  useEffect(() => {
    if (reading) setReadHref(pathname);
  }, [pathname, reading]);

  return [
    { href: readHref, label: "Lire", icon: ICONS.read, active: reading },
    { href: "/alphabet", label: "Alphabet", icon: ICONS.alphabet, active: pathname.startsWith("/alphabet") },
    { href: "/concordance", label: "Concordance", icon: ICONS.concordance, active: isConcordance },
  ];
}
