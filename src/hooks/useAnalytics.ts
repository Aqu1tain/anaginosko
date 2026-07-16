"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { initMatomo, trackPageView } from "../lib/analytics";

// Amorce Matomo au montage et enregistre une vue à chaque changement de route.
// Aucun effet tant que Matomo n'est pas configuré (voir analytics.ts).
export function useAnalytics(): void {
  const pathname = usePathname();

  useEffect(() => {
    initMatomo();
  }, []);

  useEffect(() => {
    trackPageView();
  }, [pathname]);
}
