"use client";

import Link from "next/link";
import { useNavTabs } from "./useNavTabs";

// Barre d'onglets du bas, mobile/tablette uniquement (le desktop utilise SideNav).
export default function TabBar() {
  const tabs = useNavTabs();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-base-300 bg-base-100/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md wide:hidden">
      <div className="mx-auto flex w-full max-w-2xl">
        {tabs.map((t) => (
          <Link
            key={t.label}
            href={t.href}
            aria-current={t.active ? "page" : undefined}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[0.7rem] font-medium transition-colors ${t.active ? "text-primary" : "text-base-content/70 hover:text-base-content"}`}
          >
            {t.icon}
            <span>{t.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
