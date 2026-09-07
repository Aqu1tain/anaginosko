"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import TopBar from "./_components/TopBar";
import TabBar from "./_components/TabBar";
import SideNav from "./_components/SideNav";
import SiteFooter from "./_components/SiteFooter";

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // dark = null tant qu'on n'a pas lu le thème réellement appliqué par le script
  // anti-flash (évite tout mismatch d'hydratation et tout flash de thème).
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    setDark(document.documentElement.getAttribute("data-theme") === "anaginosko-dark");
  }, []);

  useEffect(() => {
    if (dark === null) return;
    document.documentElement.setAttribute("data-theme", dark ? "anaginosko-dark" : "anaginosko");
    try {
      localStorage.setItem("anaginosko:dark", JSON.stringify(dark));
    } catch {
      /* ignore */
    }
  }, [dark]);

  // Les pages d'intégration (/embed) sont des fragments autonomes destinés à un
  // <iframe> tiers : pas de barre, de navigation ni de pied de page.
  if (pathname?.startsWith("/embed")) return <>{children}</>;

  return (
    <div className="min-h-dvh bg-base-100 text-base-content">
      <TopBar dark={dark ?? false} onToggleTheme={() => setDark((d) => !d)} />
      <div className="mx-auto flex w-full max-w-2xl px-4 wide:max-w-[84rem] wide:gap-8 wide:px-6">
        <SideNav />
        <main className="min-w-0 flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] wide:pb-16">
          {children}
          <SiteFooter />
        </main>
      </div>
      <TabBar />
    </div>
  );
}
