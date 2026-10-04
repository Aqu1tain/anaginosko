"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { can } from "../lib/api";
import { arb, arbErrors, BOOK, SinceLastVisit } from "./ArbitrageBiblion";
import { ErrorMap, ChapterRealign, LogsSection } from "./ArbitrageRealign";
import { ToTranslateList } from "./ArbitrageToTranslate";
import { NtBrowse, NtChapterEditor } from "./ArbitrageNT";

// Atelier de traduction (réservé aux traducteurs). Septante : les liens grec↔Giguet se
// recâblent dans un seul éditeur (ChapterRealign), atteignable depuis la carte des
// erreurs, « À traduire », le parcours complet, les logs et le lecteur ; le texte de
// Giguet n'est jamais modifié. Nouveau Testament : le néo-Crampon est apparié verset par
// verset, chaque verset peut recevoir une traduction maison (NtChapterEditor).

type State = { scaled: boolean; state: "auto-resolved" | "not-converged" | "pending-scale"; pending: number };
type Corpus = "lxx" | "nt";
type Open = { corpus: Corpus; book: string; ch: number; focus?: string };

export default function ArbitrageView() {
  const { user, ready } = useAuth();
  const editor = can(user, "arbitrage");
  const [corpus, setCorpus] = useState<Corpus>("lxx");
  const [tab, setTab] = useState<"corriger" | "traduire" | "browse" | "logs">("corriger");
  const [opened, setOpened] = useState<Open | null>(null);
  const [states, setStates] = useState<Record<string, Record<string, State>>>({});
  const [err, setErr] = useState<string | null>(null);
  const open = (book: string, ch: number, focus?: string) => setOpened({ corpus: "lxx", book, ch, focus });
  const openNt = (book: string, ch: number) => setOpened({ corpus: "nt", book, ch });

  const reload = useCallback(async () => {
    try {
      setStates((await arb<{ states: Record<string, Record<string, State>> }>("/queue")).states);
    } catch (e) {
      setErr(arbErrors(e).join(" "));
    }
  }, []);
  useEffect(() => { if (editor) reload(); }, [editor, reload]);

  // Deep-link depuis le lecteur : /admin/arbitrage?corpus=<nt|lxx>&book=<id>&ch=<n>.
  useEffect(() => {
    if (!editor) return;
    const sp = new URLSearchParams(window.location.search);
    const c: Corpus = sp.get("corpus") === "nt" ? "nt" : "lxx";
    const book = sp.get("book");
    const ch = Number(sp.get("ch"));
    setCorpus(c);
    if (book && Number.isInteger(ch)) setOpened({ corpus: c, book, ch });
  }, [editor]);

  // L'URL suit le corpus et le chapitre ouverts : un rechargement ou un lien partagé y revient.
  useEffect(() => {
    if (!editor) return;
    const url = new URL(window.location.href);
    url.searchParams.set("corpus", corpus);
    if (opened) { url.searchParams.set("book", opened.book); url.searchParams.set("ch", String(opened.ch)); }
    else { url.searchParams.delete("book"); url.searchParams.delete("ch"); }
    window.history.replaceState(null, "", url);
  }, [editor, corpus, opened]);

  if (!ready) return null;
  if (!editor)
    return (
      <div className="py-20 text-center text-base-content/70">
        <p>Atelier réservé aux traducteurs.</p>
        <a href="/login" className="link link-primary mt-3 inline-block">Se connecter</a>
      </div>
    );

  const close = () => { setOpened(null); if (corpus === "lxx") reload(); };
  return (
    <div className="pb-12 pt-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Atelier de traduction</h1>
          <p className="mt-1 text-sm text-base-content/60">{corpus === "lxx" ? "Septante · liens vers Giguet et traductions maison" : "Nouveau Testament · traductions maison du néo-Crampon"}</p>
        </div>
        <div className="join" role="group" aria-label="Corpus">
          <button className={`btn btn-sm join-item ${corpus === "lxx" ? "btn-primary" : "btn-ghost border border-base-300"}`} onClick={() => setCorpus("lxx")}>Septante</button>
          <button className={`btn btn-sm join-item ${corpus === "nt" ? "btn-primary" : "btn-ghost border border-base-300"}`} onClick={() => setCorpus("nt")}>Nouveau Testament</button>
        </div>
      </div>
      {err && <div className="alert alert-warning mt-3 text-sm">{err}</div>}

      {corpus === "lxx" && (
        <>
          <SinceLastVisit />
          <div role="tablist" className="tabs tabs-boxed mt-4 w-fit">
            <button className={`tab ${tab === "corriger" ? "tab-active" : ""}`} onClick={() => setTab("corriger")}>Corriger</button>
            <button className={`tab ${tab === "traduire" ? "tab-active" : ""}`} onClick={() => setTab("traduire")}>À traduire</button>
            <button className={`tab ${tab === "browse" ? "tab-active" : ""}`} onClick={() => setTab("browse")}>Parcourir tout</button>
            <button className={`tab ${tab === "logs" ? "tab-active" : ""}`} onClick={() => setTab("logs")}>Logs</button>
          </div>
          {tab === "corriger" && <ErrorMap onOpen={open} />}
          {tab === "traduire" && <ToTranslateList onOpen={open} />}
          {tab === "browse" && <BrowseList states={states} onOpen={open} />}
          {tab === "logs" && <LogsSection onOpen={open} />}
        </>
      )}
      {corpus === "nt" && <NtBrowse onOpen={openNt} />}

      {opened?.corpus === "nt" && (
        <NtChapterEditor key={`nt:${opened.book}:${opened.ch}`} book={opened.book} ch={opened.ch} onNavigate={(ch) => openNt(opened.book, ch)} onClose={close} />
      )}
      {opened?.corpus === "lxx" && (() => {
        const chs = Object.keys(states[opened.book] || {}).map(Number).filter((c) => states[opened.book][c].scaled).sort((a, b) => a - b);
        const at = chs.indexOf(opened.ch);
        return (
          <ChapterRealign key={`${opened.book}:${opened.ch}`} book={opened.book} ch={opened.ch} focusRef={opened.focus}
            prevCh={at > 0 ? chs[at - 1] : null} nextCh={at >= 0 && at < chs.length - 1 ? chs[at + 1] : null}
            onNavigate={(ch) => open(opened.book, ch)}
            onClose={close} />
        );
      })()}
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
