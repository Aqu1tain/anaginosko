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
  lectures: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="5" width="16" height="15" rx="2.5" />
      <path d="M4 10h16M9 3v4M15 3v4" />
    </svg>
  ),
  articles: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 4h9l3 3v13H6z" />
      <path d="M9 9h6M9 13h6M9 17h4" />
    </svg>
  ),
  assistant: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1-5.1-1.9 5.1-1.9z" />
      <path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
    </svg>
  ),
};

// IAnaginosko : réservé aux comptes de la bêta (rail latéral seulement).
export const assistantTab = (pathname: string): NavTab => ({
  href: "/admin/ianaginosko",
  label: "IAnaginosko",
  icon: ICONS.assistant,
  active: pathname.startsWith("/admin/ianaginosko"),
});

// « Apprendre le grec » : les cours, et les outils libres (alphabet, prononciation).
const LEARN = ["/apprendre", "/alphabet", "/prononciation"];

export type NavTab = { href: string; label: string; icon: React.ReactNode; active: boolean };

// Onglets de navigation, partagés par la barre du bas (mobile) et le rail
// latéral (desktop). Des destinations stables (Accueil / Apprendre / Concordance) :
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
    { href: "/apprendre", label: "Apprendre", icon: ICONS.alphabet, active: LEARN.some((p) => pathname.startsWith(p)) },
    { href: "/concordance", label: "Concordance", icon: ICONS.concordance, active: isConcordance },
    { href: "/lectures", label: "Lectures", icon: ICONS.lectures, active: pathname.startsWith("/lectures") },
    { href: "/articles", label: "Articles", icon: ICONS.articles, active: pathname.startsWith("/articles") },
  ];
}
