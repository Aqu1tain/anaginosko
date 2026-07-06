"use client";

import { usePathname } from "next/navigation";
import { CORPORA } from "../../src/data/corpus";

const ICONS = {
  home: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 10.5 12 4l9 6.5" />
      <path d="M5 9.5V20h14V9.5" />
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
// latéral (desktop). Des destinations stables (Accueil / Alphabet / Concordance) :
// « Accueil » ramène toujours à la racine ; la reprise de lecture vit sur la
// pastille « Reprendre » de l'accueil, pas ici (un onglet = une destination).
export function useNavTabs(): NavTab[] {
  const pathname = usePathname();
  const isConcordance = /\/concordance(\/|$)/.test(pathname);
  const reading =
    !isConcordance &&
    (pathname === "/" || pathname.startsWith("/text") || CORPORA.some((c) => pathname.startsWith(c.routePrefix)));

  return [
    { href: "/", label: "Accueil", icon: ICONS.home, active: reading },
    { href: "/alphabet", label: "Alphabet", icon: ICONS.alphabet, active: pathname.startsWith("/alphabet") },
    { href: "/concordance", label: "Concordance", icon: ICONS.concordance, active: isConcordance },
  ];
}
