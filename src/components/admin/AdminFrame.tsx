"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/src/hooks/useAuth";
import { can, fetchAdminReports, isLearner, type AuthUser } from "@/src/lib/api";
import type { Permission } from "@/src/data/permissions";

type Tab = { href: string; label: string; icon: string; show: (u: AuthUser | null) => boolean; badge?: "reports" };

// Tracés d'icônes (trait 1.8, grille 24).
const ICON = {
  overview: "M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z",
  articles: "M6 3h9l3 3v15H6zM9 9h6M9 13h6M9 17h4",
  courses: "M3 9l9-5 9 5-9 5zM7 11.5V16c0 1.7 2.2 3 5 3s5-1.3 5-3v-4.5",
  books: "M4 5h4v15H4zM10 5h4v15h-4zM16.5 6l3.5-.9 3 14.6-3.6.8z",
  workshop: "M4 20l4-1 11-11-3-3L5 16zM14 6l3 3",
  reports: "M5 21V4M5 4h11l-2 4 2 4H5",
  annotations: "M4 5h16v11H9l-5 4z",
  definitions: "M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3zM5 17a3 3 0 013-3h11M9 8h6",
  stats: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  accounts: "M9 11a4 4 0 100-8 4 4 0 000 8zM2 21c0-3.3 3.1-6 7-6s7 2.7 7 6M16 3.5a4 4 0 010 7.5M22 21c0-2.7-1.6-4.9-4-5.7",
};

function TabIcon({ d }: { d: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const any = (u: AuthUser | null, ...perms: Permission[]) => perms.some((p) => can(u, p));

const TABS: Tab[] = [
  { href: "/admin", label: "Vue d’ensemble", icon: ICON.overview, show: (u) => !!u },
  { href: "/admin/articles", label: "Articles", icon: ICON.articles, show: (u) => any(u, "articles", "review", "publish") },
  { href: "/admin/cours", label: "Cours", icon: ICON.courses, show: (u) => any(u, "courses") },
  { href: "/admin/livres", label: "Livres", icon: ICON.books, show: (u) => any(u, "review") },
  { href: "/admin/arbitrage", label: "Atelier", icon: ICON.workshop, show: (u) => any(u, "arbitrage") },
  { href: "/admin/signalements", label: "Signalements", icon: ICON.reports, show: (u) => any(u, "reports"), badge: "reports" },
  { href: "/admin/annotations", label: "Annotations", icon: ICON.annotations, show: (u) => any(u, "dashboard") },
  { href: "/admin/definitions", label: "Définitions", icon: ICON.definitions, show: (u) => any(u, "dashboard") },
  { href: "/admin/statistiques", label: "Statistiques", icon: ICON.stats, show: (u) => any(u, "dashboard") },
  { href: "/admin/comptes", label: "Comptes", icon: ICON.accounts, show: (u) => any(u, "accounts") },
];

// Éditeurs plein écran : pas d'onglets.
const FULL = [/^\/admin\/articles\/[^/]+$/, /^\/admin\/arbitrage/, /^\/admin\/ianaginosko/];

// Cadre de l'administration : une rangée d'onglets commune à toutes les pages.
export default function AdminFrame({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const pathname = usePathname();
  const [pending, setPending] = useState(0);
  const reports = can(user, "reports");

  useEffect(() => {
    if (!reports) return;
    fetchAdminReports({ status: "pending" })
      .then((r) => setPending(r.length))
      .catch(() => setPending(0));
  }, [reports, pathname]);

  if (!ready || !user || isLearner(user) || FULL.some((re) => re.test(pathname))) return <>{children}</>;

  const tabs = TABS.filter((t) => t.show(user));
  const active = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  return (
    <>
      <nav aria-label="Administration" className="-mx-4 mb-2 overflow-x-auto border-b border-base-300 px-4 wide:mx-0 wide:px-0">
        <ul className="flex gap-1">
          {tabs.map((t) => (
            <li key={t.href} className="shrink-0">
              <Link
                href={t.href}
                aria-current={active(t.href) ? "page" : undefined}
                className={`relative flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors ${active(t.href) ? "text-base-content" : "text-base-content/70 hover:text-base-content"}`}
              >
                <span className={active(t.href) ? "text-primary" : "opacity-70"}>
                  <TabIcon d={t.icon} />
                </span>
                {t.label}
                {t.badge === "reports" && pending > 0 && (
                  <span className="rounded-full bg-warning px-1.5 text-[0.7rem] font-semibold tabular-nums text-warning-content">{pending}</span>
                )}
                {active(t.href) && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {children}
    </>
  );
}
