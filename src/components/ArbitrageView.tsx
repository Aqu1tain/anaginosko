"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { BOOK, SinceLastVisit } from "./ArbitrageBiblion";
import { ErrorMap, ChapterRealign, LogsSection } from "./ArbitrageRealign";

// Outil d'arbitrage des liens grec↔Giguet (réservé philologue/admin). UN SEUL éditeur :
// le réalignement deux-colonnes (ChapterRealign), atteignable PARTOUT — depuis la carte
// des erreurs (Corriger), depuis le parcours de tous les chapitres (Parcourir tout, même
// ce qui ne lève pas d'erreur), depuis les logs, et depuis un lien du lecteur. On ne
// modifie jamais le texte Giguet ; on ne fait que le câbler. Les suscriptions de psaumes
// (titres omis par Giguet) se traduisent maison directement dans l'éditeur.

type State = { scaled: boolean; state: "auto-resolved" | "not-converged" | "pending-scale"; pending: number };

const API = "/admin/arbitrage/api";
const token = () => (typeof window !== "undefined" ? localStorage.getItem("anaginosko:token") : null);
async function arb<T>(p: string, opts?: RequestInit): Promise<T> {
  const r = await fetch(`${API}${p}`, {
    ...opts,
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json", ...(opts?.headers || {}) },
  });
  return r.json();
}

export default function ArbitrageView() {
  const { user, ready } = useAuth();
  const editor = user?.role === "admin" || user?.role === "philologist";
  const [tab, setTab] = useState<"corriger" | "browse" | "logs">("corriger");
  const [realign, setRealign] = useState<{ book: string; ch: number } | null>(null);
  const [states, setStates] = useState<Record<string, Record<string, State>>>({});
  const [err, setErr] = useState<string | null>(null);
  const open = (book: string, ch: number) => setRealign({ book, ch });

  const reload = useCallback(async () => {
    const d = await arb<{ states: Record<string, Record<string, State>>; error?: string }>("/queue");
    if (d.error) return setErr(d.error);
    setStates(d.states);
  }, []);
  useEffect(() => { if (editor) reload(); }, [editor, reload]);

  // Deep-link depuis le lecteur : /admin/arbitrage?book=<id>&ch=<n> ouvre le chapitre
  // dans l'éditeur.
  useEffect(() => {
    if (!editor) return;
    const sp = new URLSearchParams(window.location.search);
    const book = sp.get("book");
    const ch = Number(sp.get("ch"));
    if (book && Number.isInteger(ch)) setRealign({ book, ch });
  }, [editor]);

  if (!ready) return null;
  if (!editor)
    return (
      <div className="py-20 text-center text-base-content/70">
        <p>Arbitrage réservé aux philologues.</p>
        <a href="/login" className="link link-primary mt-3 inline-block">Se connecter</a>
      </div>
    );

  return (
    <div className="pb-12 pt-6">
      <h1 className="text-2xl font-bold">Arbitrage des liens</h1>
      {err && <div className="alert alert-warning mt-3 text-sm">{err}</div>}
      <SinceLastVisit />

      <div role="tablist" className="tabs tabs-boxed mt-4 w-fit">
        <button className={`tab ${tab === "corriger" ? "tab-active" : ""}`} onClick={() => setTab("corriger")}>Corriger</button>
        <button className={`tab ${tab === "browse" ? "tab-active" : ""}`} onClick={() => setTab("browse")}>Parcourir tout</button>
        <button className={`tab ${tab === "logs" ? "tab-active" : ""}`} onClick={() => setTab("logs")}>Logs</button>
      </div>

      {tab === "corriger" && <ErrorMap onOpen={open} />}
      {tab === "browse" && <BrowseList states={states} onOpen={open} />}
      {tab === "logs" && <LogsSection onOpen={open} />}

      {realign && <ChapterRealign book={realign.book} ch={realign.ch} onClose={() => { setRealign(null); reload(); }} />}
    </div>
  );
}

// Parcours de TOUS les chapitres arbitrables (scaled), pour ouvrir l'éditeur même sur un
// chapitre qui ne lève aucune erreur. Ouvre le même éditeur que Corriger.
function BrowseList({ states, onOpen }: { states: Record<string, Record<string, State>>; onOpen: (b: string, c: number) => void }) {
  const books = Object.keys(states).sort();
  if (!books.length) return <p className="mt-6 text-sm text-base-content/60">Aucun chapitre disponible.</p>;
  return (
    <div className="mt-4 grid gap-4">
      <p className="text-sm text-base-content/70">Tous les chapitres. Ouvre-en un pour l'éditer, même s'il ne lève pas d'erreur.</p>
      {books.map((book) => {
        const chs = Object.keys(states[book]).map(Number).sort((a, b) => a - b);
        const visible = chs.filter((c) => states[book][c].scaled);
        if (!visible.length) return null;
        const locked = chs.length - visible.length;
        return (
          <div key={book}>
            <h3 className="text-sm font-semibold">{BOOK[book] ?? book}
              {locked > 0 && <span className="ml-2 text-xs font-normal text-base-content/50">· {locked} chapitres verrouillés (pending-scale)</span>}
            </h3>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {visible.map((c) => {
                const s = states[book][c];
                const notConv = s.state === "not-converged";
                return (
                  <button key={c} onClick={() => onOpen(book, c)}
                    className={`btn btn-sm ${notConv ? "btn-warning btn-outline" : s.pending ? "btn-outline border-error/50" : "btn-ghost border border-base-300"}`}
                    title={notConv ? "Non convergé : liage manuel" : s.pending ? `${s.pending} arbitrage(s) en attente` : "Auto-résolu"}>
                    {c}
                    {s.pending > 0 && <span className="badge badge-xs badge-error ml-1">{s.pending}</span>}
                    {notConv && <span className="ml-1 text-[0.65rem] uppercase">manuel</span>}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
