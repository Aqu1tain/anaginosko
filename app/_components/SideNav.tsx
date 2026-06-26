"use client";

import Link from "next/link";
import { useNavTabs } from "./useNavTabs";

// Rail de navigation latéral, desktop uniquement (≥ wide). Dans le flux, à
// gauche du contenu, collé au défilement.
export default function SideNav() {
  const tabs = useNavTabs();
  return (
    <nav className="sticky top-20 hidden h-fit shrink-0 flex-col gap-2 self-start wide:flex">
      {tabs.map((t) => (
        <Link
          key={t.label}
          href={t.href}
          aria-current={t.active ? "page" : undefined}
          className={`group flex flex-col items-center gap-1 text-[0.7rem] font-medium transition-colors ${t.active ? "text-primary" : "text-base-content/70 hover:text-base-content"}`}
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
