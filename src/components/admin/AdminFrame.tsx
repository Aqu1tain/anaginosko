"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/src/hooks/useAuth";
import { can, fetchAdminReports, isLearner, type AuthUser } from "@/src/lib/api";
import type { Permission } from "@/src/data/permissions";

type Tab = { href: string; label: string; show: (u: AuthUser | null) => boolean; badge?: "reports" };

const any = (u: AuthUser | null, ...perms: Permission[]) => perms.some((p) => can(u, p));

const TABS: Tab[] = [
  { href: "/admin", label: "Vue d’ensemble", show: (u) => !!u },
  { href: "/admin/articles", label: "Articles", show: (u) => any(u, "articles", "review", "publish") },
  { href: "/admin/cours", label: "Cours", show: (u) => any(u, "courses") },
  { href: "/admin/livres", label: "Livres", show: (u) => any(u, "review") },
  { href: "/admin/arbitrage", label: "Atelier", show: (u) => any(u, "arbitrage") },
  { href: "/admin/signalements", label: "Signalements", show: (u) => any(u, "reports"), badge: "reports" },
  { href: "/admin/annotations", label: "Annotations", show: (u) => any(u, "dashboard") },
  { href: "/admin/definitions", label: "Définitions", show: (u) => any(u, "dashboard") },
  { href: "/admin/statistiques", label: "Statistiques", show: (u) => any(u, "dashboard") },
  { href: "/admin/comptes", label: "Comptes", show: (u) => any(u, "accounts") },
];

// Éditeurs plein écran : pas d'onglets.
const FULL = [/^\/admin\/articles\/[^/]+$/, /^\/admin\/arbitrage/];

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
                className={`relative flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors ${active(t.href) ? "text-base-content" : "text-base-content/55 hover:text-base-content"}`}
              >
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
