"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/src/hooks/useAuth";
import { can, fetchAdminReports, isLearner, type AuthUser } from "@/src/lib/api";
import type { Permission } from "@/src/data/permissions";
import Chevron from "@/src/components/Chevron";

type Item = { href: string; label: string; icon: string; show: (u: AuthUser | null) => boolean; badge?: "reports" };
type Group = { label?: string; items: Item[] };

// Tracés d'icônes (trait 1.8, grille 24).
const ICON = {
  overview: "M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z",
  articles: "M6 3h9l3 3v15H6zM9 9h6M9 13h6M9 17h4",
  courses: "M3 9l9-5 9 5-9 5zM7 11.5V16c0 1.7 2.2 3 5 3s5-1.3 5-3v-4.5",
  annotations: "M4 5h16v11H9l-5 4z",
  definitions: "M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3zM5 17a3 3 0 013-3h11M9 8h6",
  workshop: "M4 20l4-1 11-11-3-3L5 16zM14 6l3 3",
  books: "M12 7v14M3 18V4h5a4 4 0 014 4 4 4 0 014-4h5v14h-6a3 3 0 00-3 3 3 3 0 00-3-3z",
  reports: "M5 21V4M5 4h11l-2 4 2 4H5",
  stats: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  accounts: "M9 11a4 4 0 100-8 4 4 0 000 8zM2 21c0-3.3 3.1-6 7-6s7 2.7 7 6M16 3.5a4 4 0 010 7.5M22 21c0-2.7-1.6-4.9-4-5.7",
};

function NavIcon({ d }: { d: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
      <path d={d} />
    </svg>
  );
}

const any = (u: AuthUser | null, ...perms: Permission[]) => perms.some((p) => can(u, p));

const GROUPS: Group[] = [
  { items: [{ href: "/admin", label: "Aperçu", icon: ICON.overview, show: (u) => !!u }] },
  {
    label: "Publications",
    items: [
      { href: "/admin/articles", label: "Articles", icon: ICON.articles, show: (u) => any(u, "articles", "review", "publish") },
      { href: "/admin/cours", label: "Cours", icon: ICON.courses, show: (u) => any(u, "courses") },
      { href: "/admin/annotations", label: "Annotations", icon: ICON.annotations, show: (u) => any(u, "dashboard") },
      { href: "/admin/definitions", label: "Définitions", icon: ICON.definitions, show: (u) => any(u, "dashboard") },
    ],
  },
  {
    label: "Bible",
    items: [
      { href: "/admin/arbitrage", label: "Atelier", icon: ICON.workshop, show: (u) => any(u, "arbitrage") },
      { href: "/admin/livres", label: "Introductions", icon: ICON.books, show: (u) => any(u, "review") },
    ],
  },
  {
    label: "Suivi",
    items: [
      { href: "/admin/signalements", label: "Signalements", icon: ICON.reports, show: (u) => any(u, "reports"), badge: "reports" },
      { href: "/admin/statistiques", label: "Statistiques", icon: ICON.stats, show: (u) => any(u, "dashboard") },
      { href: "/admin/comptes", label: "Comptes", icon: ICON.accounts, show: (u) => any(u, "accounts") },
    ],
  },
];

// Éditeurs plein écran : pas de navigation.
const FULL = [/^\/admin\/articles\/[^/]+$/, /^\/admin\/arbitrage/, /^\/admin\/ianaginosko/];

const isActive = (href: string, pathname: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

function Badge({ count }: { count: number }) {
  if (!count) return null;
  return <span className="ml-auto rounded-full bg-warning px-2 text-xs font-semibold tabular-nums text-warning-content">{count}</span>;
}

function NavList({ groups, pathname, pending, row }: { groups: Group[]; pathname: string; pending: number; row: string }) {
  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <div key={g.label ?? "root"}>
          {g.label && <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-base-content/70">{g.label}</p>}
          <ul className="space-y-0.5">
            {g.items.map((t) => {
              const active = isActive(t.href, pathname);
              return (
                <li key={t.href}>
                  <Link
                    href={t.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-lg px-3 text-sm transition-colors ${row} ${active ? "bg-primary/10 font-semibold text-primary" : "text-base-content/80 hover:bg-base-200 hover:text-base-content"}`}
                  >
                    <NavIcon d={t.icon} />
                    {t.label}
                    {t.badge === "reports" && <Badge count={pending} />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

// Sur téléphone et tablette : la section en cours, qui ouvre la liste complète.
function SectionPicker({ groups, pathname, pending }: { groups: Group[]; pathname: string; pending: number }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const current = groups.flatMap((g) => g.items).find((t) => isActive(t.href, pathname));

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

  return (
    <div ref={box} className="relative pt-4 wide:hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="admin-sections"
        className="flex min-h-12 w-full items-center gap-3 rounded-box border border-base-300 bg-base-100 px-4 text-left text-sm font-semibold transition-colors hover:bg-base-200"
      >
        {current && <NavIcon d={current.icon} />}
        <span className="flex-1">{current?.label ?? "Tableau de bord"}</span>
        <Badge count={pending} />
        <span className={`text-base-content/70 transition-transform ${open ? "-rotate-90" : "rotate-90"}`}>
          <Chevron to="right" />
        </span>
      </button>
      {open && (
        <nav id="admin-sections" aria-label="Tableau de bord" className="absolute inset-x-0 top-full z-20 mt-2 rounded-box border border-base-300 bg-base-100 p-2 py-4 shadow-lg">
          <NavList groups={groups} pathname={pathname} pending={pending} row="min-h-11" />
        </nav>
      )}
    </div>
  );
}

// Cadre du tableau de bord : colonne de navigation groupée sur ordinateur,
// sélecteur de section sur téléphone.
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

  const groups = GROUPS.map((g) => ({ ...g, items: g.items.filter((t) => t.show(user)) })).filter((g) => g.items.length);

  return (
    <div className="wide:flex wide:gap-10">
      <aside className="hidden w-56 shrink-0 wide:block">
        <nav aria-label="Tableau de bord" className="sticky top-14 py-6">
          <NavList groups={groups} pathname={pathname} pending={pending} row="h-10" />
        </nav>
      </aside>
      <SectionPicker groups={groups} pathname={pathname} pending={pending} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
