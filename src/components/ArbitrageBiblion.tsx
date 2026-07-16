"use client";

import { useEffect, useMemo, useState } from "react";
import { LXX_BOOK_NAMES } from "../data/lxx";

// Fondations partagées de l'outil d'arbitrage : client API (token + fetch), table des
// noms de livres, et l'encart « depuis ta dernière visite ». Tout le travail passe par
// l'éditeur unique (ChapterRealign) ; on écrit toujours dans l'ARB_DIR via /resolve.

const API = "/admin/arbitrage/api";
const token = () => (typeof window !== "undefined" ? localStorage.getItem("anaginosko:token") : null);
export async function arb<T>(p: string, opts?: RequestInit): Promise<T> {
  const r = await fetch(`${API}${p}`, { ...opts, headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json", ...(opts?.headers || {}) } });
  return r.json();
}

// Table des noms de livres : la carte canonique complète de la Septante (tous les
// livres, pas un sous-ensemble codé en dur), partagée avec le lecteur et la concordance.
export const BOOK = LXX_BOOK_NAMES;

// ─────────────────────────────── Depuis ta dernière visite ───────────────────────────────
const LAST_VISIT_KEY = "anaginosko:arb:lastvisit";
export function SinceLastVisit() {
  const [data, setData] = useState<{ installed: { book: string; ref: string; by: string; at: string; maison?: string }[]; archived: { book: string; ref: string }[] } | null>(null);
  const since = useMemo(() => (typeof window !== "undefined" ? localStorage.getItem(LAST_VISIT_KEY) || "" : ""), []);
  useEffect(() => {
    arb<typeof data>(`/since?since=${encodeURIComponent(since)}`).then(setData).catch(() => {});
    // On mémorise la visite courante à la fermeture de session (montage suivant = diff depuis maintenant).
    return () => { try { localStorage.setItem(LAST_VISIT_KEY, new Date().toISOString()); } catch {} };
  }, [since]);
  if (!since || !data || (data.installed.length === 0 && data.archived.length === 0)) return null;
  return (
    <div className="alert alert-info mt-3 flex-col items-start gap-1 text-sm">
      <span className="font-semibold">Depuis ta dernière visite</span>
      {data.installed.length > 0 && <span>{data.installed.length} entrée(s) installée(s)/fraîche(s) : {data.installed.slice(0, 8).map((e) => `${e.book} ${e.ref}`).join(", ")}{data.installed.length > 8 ? "…" : ""}</span>}
      {data.archived.length > 0 && <span>{data.archived.length} archivée(s) : {data.archived.slice(0, 8).map((e) => `${e.book} ${e.ref}`).join(", ")}</span>}
    </div>
  );
}
