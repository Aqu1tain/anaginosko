"use client";

import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import Link from "next/link";
import Chevron from "@/src/components/Chevron";

export type NavItem = { href: string; label: string; icon: string; active: boolean; badge?: number };
export type NavGroup = { label?: string; items: NavItem[] };

export function NavIcon({ d }: { d: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
      <path d={d} />
    </svg>
  );
}

function Badge({ count }: { count?: number }) {
  if (!count) return null;
  return <span className="ml-auto rounded-full bg-warning px-2 text-xs font-semibold tabular-nums text-warning-content">{count}</span>;
}

function NavList({ groups, row }: { groups: NavGroup[]; row: string }) {
  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <div key={g.label ?? "root"}>
          {g.label && <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-base-content/70">{g.label}</p>}
          <ul className="space-y-0.5">
            {g.items.map((t) => (
              <li key={t.href}>
                <Link
                  href={t.href}
                  aria-current={t.active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-lg px-3 text-sm transition-colors ${row} ${t.active ? "bg-primary/10 font-semibold text-primary" : "text-base-content/80 hover:bg-base-200 hover:text-base-content"}`}
                >
                  <NavIcon d={t.icon} />
                  {t.label}
                  <Badge count={t.badge} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// Sur téléphone et tablette : la section en cours, qui ouvre la liste complète.
function SectionPicker({ label, groups, top, footer }: { label: string; groups: NavGroup[]; top?: ReactNode; footer?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const items = groups.flatMap((g) => g.items);
  const current = items.find((t) => t.active);
  const pending = items.reduce((n, t) => n + (t.badge ?? 0), 0);

  useEffect(() => {
    if (!open) return;
    const close = (e: globalThis.MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const closeOnLink = (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest("a")) setOpen(false);
  };

  return (
    <div ref={box} className="relative pt-4 wide:hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="space-sections"
        className="flex min-h-12 w-full items-center gap-3 rounded-box border border-base-300 bg-base-100 px-4 text-left text-sm font-semibold transition-colors hover:bg-base-200"
      >
        {current && <NavIcon d={current.icon} />}
        <span className="flex-1">{current?.label ?? label}</span>
        <Badge count={pending} />
        <span className={`text-base-content/70 transition-transform ${open ? "-rotate-90" : "rotate-90"}`}>
          <Chevron to="right" />
        </span>
      </button>
      {open && (
        <nav id="space-sections" aria-label={label} onClick={closeOnLink} className="absolute inset-x-0 top-full z-20 mt-2 space-y-6 rounded-box border border-base-300 bg-base-100 p-2 py-4 shadow-lg">
          {top && <div className="px-1">{top}</div>}
          <NavList groups={groups} row="min-h-11" />
          {footer && <div className="border-t border-base-300 pt-2">{footer}</div>}
        </nav>
      )}
    </div>
  );
}

// Coque d'un espace de travail : colonne de navigation groupée sur ordinateur,
// sélecteur de section sur téléphone.
export default function SpaceShell({ label, groups, top, footer, children }: { label: string; groups: NavGroup[]; top?: ReactNode; footer?: ReactNode; children: ReactNode }) {
  return (
    <div className="wide:flex wide:gap-10">
      <aside className="hidden w-56 shrink-0 wide:block">
        <nav aria-label={label} className="sticky top-14 space-y-6 py-6">
          {top}
          <NavList groups={groups} row="h-10" />
          {footer && <div className="border-t border-base-300 pt-4">{footer}</div>}
        </nav>
      </aside>
      <SectionPicker label={label} groups={groups} top={top} footer={footer} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

// Lien vers un autre espace, en pied de colonne.
export function SpaceLink({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <Link href={href} className="flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm text-base-content/80 transition-colors hover:bg-base-200 hover:text-base-content">
      <NavIcon d={icon} />
      <span className="flex-1">{label}</span>
      <span className="text-base-content/60" aria-hidden="true">
        <Chevron to="right" />
      </span>
    </Link>
  );
}
