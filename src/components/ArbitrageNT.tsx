"use client";

import { useCallback, useEffect, useState } from "react";
import { arb, arbErrors } from "./ArbitrageBiblion";
import { MaisonInline } from "./ArbitrageRealign";

// Atelier de traduction du NT : le néo-Crampon est apparié verset par verset, il n'y a
// rien à réaligner ; on peut seulement le remplacer par une traduction maison.
type NtBook = { book: string; label: string; chapters: { ch: number; maison: number }[] };
type Verse = { v: number; ref: string; greek: string; crampon: string | null; maison: string | null; by: string | null };
type Chapter = { book: string; label: string; ch: number; chapters: number; verses: Verse[] };

const who = (by: string | null) => (by === "Βιβλίον" ? "Biblion" : by);

export function NtBrowse({ onOpen }: { onOpen: (book: string, ch: number) => void }) {
  const [books, setBooks] = useState<NtBook[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { arb<{ books: NtBook[] }>("/nt/books").then((d) => setBooks(d.books)).catch((e) => setErr(arbErrors(e).join(" "))); }, []);
  if (err) return <div className="alert alert-error mt-6 text-sm">{err}</div>;
  if (!books) return <p className="mt-6 text-sm text-base-content/60">Chargement…</p>;
  const total = books.reduce((s, b) => s + b.chapters.reduce((t, c) => t + c.maison, 0), 0);
  return (
    <div className="mt-4 grid gap-4">
      <p className="text-sm text-base-content/70">
        Le néo-Crampon est servi par défaut. Ouvre un chapitre pour remplacer un verset par ta traduction.
        {total > 0 && <> <span className="font-semibold text-secondary">{total}</span> versets traduits maison.</>}
      </p>
      {books.map((b) => (
        <div key={b.book}>
          <h3 className="text-sm font-semibold">{b.label}</h3>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {b.chapters.map((c) => (
              <button key={c.ch} onClick={() => onOpen(b.book, c.ch)} className={`btn btn-sm ${c.maison ? "btn-secondary btn-outline" : "btn-ghost border border-base-300"}`}>
                {c.ch}
                {c.maison > 0 && <span className="badge badge-xs badge-secondary ml-1">{c.maison}</span>}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function NtChapterEditor({ book, ch, onNavigate, onClose }: { book: string; ch: number; onNavigate: (ch: number) => void; onClose: () => void }) {
  const [data, setData] = useState<Chapter | null>(null);
  const [draft, setDraft] = useState<Record<string, string | null>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string[] | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await arb<Chapter>(`/nt/chapter?book=${book}&ch=${ch}`));
      setDraft({});
    } catch (e) {
      setErr(arbErrors(e));
    }
  }, [book, ch]);
  useEffect(() => { load(); }, [load]);

  const dirty = Object.keys(draft).length;
  const save = useCallback(async () => {
    if (!dirty || busy) return;
    setBusy(true); setErr(null);
    try {
      await arb("/nt/save", { method: "POST", body: JSON.stringify({ book, changes: Object.entries(draft).map(([ref, maison]) => ({ ref, maison })) }) });
      await load();
    } catch (e) {
      setErr(arbErrors(e));
    } finally {
      setBusy(false);
    }
  }, [book, draft, dirty, busy, load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); save(); } };
    const guard = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault(); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", guard);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("beforeunload", guard); };
  }, [save, dirty]);

  const confirmLeave = () => !dirty || window.confirm(`${dirty} modification(s) non enregistrée(s) seront perdues. Continuer sans enregistrer ?`);
  // Un texte identique à l'état enregistré (ou au Crampon pour un verset non traduit)
  // n'est pas une modification.
  const set = (v: Verse, maison: string | null) =>
    setDraft((d) => {
      const n = { ...d };
      if (maison === v.maison || (!v.maison && maison === v.crampon)) delete n[v.ref];
      else n[v.ref] = maison;
      return n;
    });

  return (
    <div className="fixed inset-0 z-[80] flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={() => confirmLeave() && onClose()} />
      <div className="relative h-full w-full max-w-4xl overflow-y-auto bg-base-100 p-5 shadow-2xl">
        <div className="sticky -top-5 z-10 -mx-5 -mt-5 border-b border-base-200 bg-base-100 px-5 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="join">
              <button className="btn btn-sm btn-ghost join-item" disabled={ch <= 1 || busy} title="Chapitre précédent" onClick={() => confirmLeave() && onNavigate(ch - 1)}>←</button>
              <h2 className="join-item px-1 text-lg font-bold">{data?.label ?? book} {ch}</h2>
              <button className="btn btn-sm btn-ghost join-item" disabled={!data || ch >= data.chapters || busy} title="Chapitre suivant" onClick={() => confirmLeave() && onNavigate(ch + 1)}>→</button>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button className="btn btn-sm btn-primary" disabled={busy || !dirty} onClick={save} title="Ctrl+S">Enregistrer{dirty ? ` (${dirty})` : ""}</button>
              <button className="btn btn-sm btn-ghost" onClick={() => confirmLeave() && onClose()}>Fermer</button>
            </div>
          </div>
          <p className="mt-1 text-xs text-base-content/55">En regard du grec : le néo-Crampon, ou ta traduction quand tu en as écrit une.</p>
        </div>

        {err && <div className="alert alert-error mt-3 flex-col items-start gap-0.5 text-xs">{err.map((e, i) => <div key={i}>{e}</div>)}</div>}
        {!data && !err && <p className="mt-6 text-sm text-base-content/60">Chargement…</p>}

        <div className="mt-3 grid gap-1.5">
          {data?.verses.map((v) => {
            const current = v.ref in draft ? draft[v.ref] : v.maison;
            const changed = v.ref in draft;
            return (
              <div key={v.ref} className={`grid gap-3 rounded-box border p-2.5 sm:grid-cols-2 ${changed ? "border-primary bg-primary/5" : current ? "border-secondary/40" : "border-base-200"}`}>
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-base-content/50">v.{v.v}</span>
                  <p className="font-greek mt-0.5 leading-snug">{v.greek}</p>
                </div>
                <div className="min-w-0 border-t border-base-200 pt-2 sm:border-l sm:border-t-0 sm:pl-3 sm:pt-0">
                  <span className="text-[0.7rem] uppercase tracking-wide text-base-content/45">{current ? `maison${v.by && !changed ? ` · ${who(v.by)}` : ""}` : "néo-Crampon"}</span>
                  <p className={`mt-0.5 text-sm leading-relaxed ${!(current ?? v.crampon) ? "italic text-base-content/35" : ""}`}>{current ?? v.crampon ?? "sans traduction française"}</p>
                  {current && v.crampon && <p className="mt-1 text-xs leading-relaxed text-base-content/45">Crampon : {v.crampon}</p>}
                  <div className="mt-1.5 flex flex-wrap items-center gap-1">
                    <MaisonInline current={current ?? v.crampon ?? ""} original={v.crampon} originalLabel="Crampon" onSet={(t) => set(v, t)} />
                    {current && <button className="btn btn-ghost btn-xs" onClick={() => set(v, null)}>revenir au Crampon</button>}
                    {changed && <button className="btn btn-ghost btn-xs" onClick={() => set(v, v.maison)}>annuler</button>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
