"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/src/hooks/useAuth";
import { can } from "@/src/lib/api";
import { assistantTab, useNavTabs } from "./useNavTabs";

// Rail de navigation latéral, desktop uniquement (≥ wide), fixé au bord gauche
// de la fenêtre sous la barre du haut.
export default function SideNav() {
  const { user } = useAuth();
  const pathname = usePathname();
  const tabs = [...useNavTabs(), ...(can(user, "ai") ? [assistantTab(pathname)] : [])];
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed bottom-0 left-0 top-[calc(3.5rem+env(safe-area-inset-top)+1px)] z-20 hidden w-[5.5rem] flex-col items-center gap-1 overflow-y-auto bg-base-100 py-4 wide:flex"
    >
      {tabs.map((t) => (
        <Link
          key={t.label}
          href={t.href}
          aria-current={t.active ? "page" : undefined}
          className={`group flex w-full flex-col items-center gap-1 py-1.5 text-[0.7rem] font-medium transition-colors ${t.active ? "text-primary" : "text-base-content/70 hover:text-base-content"}`}
        >
          <span className={`grid h-11 w-11 place-items-center rounded-2xl transition-colors ${t.active ? "bg-primary/12 text-primary" : "group-hover:bg-base-200"}`}>
            {t.icon}
          </span>
          <span>{t.label}</span>
        </Link>
      ))}
    </nav>
  );
}
