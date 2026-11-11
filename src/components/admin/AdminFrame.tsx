"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/src/hooks/useAuth";
import { can, fetchAdminReports, isLearner, type AuthUser } from "@/src/lib/api";
import type { Permission } from "@/src/data/permissions";
import SpaceShell, { SpaceLink } from "./SpaceShell";
import { ICON } from "./icons";

type Item = { href: string; label: string; icon: string; show: (u: AuthUser | null) => boolean; badge?: "reports" };
type Group = { label?: string; items: Item[] };

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

// Cadre du tableau de bord ; l'atelier de traduction a son propre espace.
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

  const groups = GROUPS.map((g) => ({
    label: g.label,
    items: g.items
      .filter((t) => t.show(user))
      .map((t) => ({ href: t.href, label: t.label, icon: t.icon, active: isActive(t.href, pathname), badge: t.badge === "reports" ? pending : undefined })),
  })).filter((g) => g.items.length);

  return (
    <SpaceShell
      label="Tableau de bord"
      groups={groups}
      footer={can(user, "arbitrage") && <SpaceLink href="/admin/arbitrage" label="Atelier de traduction" icon={ICON.workshop} />}
    >
      {children}
    </SpaceShell>
  );
}
