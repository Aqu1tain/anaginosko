"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../hooks/useAuth";

// Outil d'arbitrage des liens grec↔Giguet (réservé philologue/admin). Biblion suit
// la passe : il ne voit et n'agit que sur les chapitres SCALED. Modèle de liens :
// un verset grec -> suite ordonnée de versets Giguet (0 = orphelin, 2+ = scission).
// On ne modifie jamais le texte Giguet ; on ne fait que le câbler.

type Src = [number, number];
type State = { scaled: boolean; state: "auto-resolved" | "not-converged" | "pending-scale"; pending: number };
type QItem = {
  book: string; ref: string; kind: string; priority: number; reason?: string; greek?: string;
  proposals?: { reader: string; sources: [string, string][]; orphan?: [string, string][] }[];
};
type Row = { v: number; greek: string; ref: string; sources: Src[] | null; french: string | null; orphanGreek: boolean; overridden: boolean };
type Chapter = { book: string; ch: number; state: State; rows: Row[]; queueItems: QItem[] };

const API = "/admin/arbitrage/api";
const token = () => (typeof window !== "undefined" ? localStorage.getItem("anaginosko:token") : null);
async function arb<T>(p: string, opts?: RequestInit): Promise<T> {
  const r = await fetch(`${API}${p}`, {
    ...opts,
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json", ...(opts?.headers || {}) },
  });
  return r.json();
}
const KINDS: Record<string, string> = {
  "reader-divergence": "Divergence de lecteurs", "orphan-vs-split": "Orphelin ou scission ?", "low-confidence": "Confiance faible",
};
const BOOK: Record<string, string> = { sir: "Siracide", isa: "Isaïe", psa: "Psaumes", tst: "Chapitre-test" };

export default function ArbitrageView() {
  const { user, ready } = useAuth();
  const editor = user?.role === "admin" || user?.role === "philologist";
  const [tab, setTab] = useState<"queue" | "browse">("queue");
  const [queue, setQueue] = useState<QItem[]>([]);
  const [states, setStates] = useState<Record<string, Record<string, State>>>({});
  const [open, setOpen] = useState<{ book: string; ch: number; focus?: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const d = await arb<{ queue: QItem[]; states: typeof states; error?: string }>("/queue");
    if (d.error) return setErr(d.error);
    setQueue(d.queue);
    setStates(d.states);
  }, []);
  useEffect(() => { if (editor) reload(); }, [editor, reload]);

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
      <p className="mt-1 max-w-prose text-sm text-base-content/70">
        Le grec (Rahlfs) est la colonne autoritaire. Vous reliez chaque verset grec à un ou plusieurs
        versets Giguet — jamais vous n’en modifiez le texte. Vous n’agissez que sur les chapitres déjà
        passés par l’alignement (scaled) ; les autres sont verrouillés.
      </p>
      {err && <div className="alert alert-warning mt-3 text-sm">{err}</div>}

      <div role="tablist" className="tabs tabs-boxed mt-4 w-fit">
        <button className={`tab ${tab === "queue" ? "tab-active" : ""}`} onClick={() => setTab("queue")}>
          File d’arbitrage <span className="badge badge-sm ml-2">{queue.length}</span>
        </button>
        <button className={`tab ${tab === "browse" ? "tab-active" : ""}`} onClick={() => setTab("browse")}>Parcourir</button>
      </div>

      {tab === "queue" && <QueueList queue={queue} onOpen={(book, ch, focus) => setOpen({ book, ch, focus })} />}
      {tab === "browse" && <BrowseList states={states} onOpen={(book, ch) => setOpen({ book, ch })} />}

      {open && <ChapterEditor sel={open} onClose={() => { setOpen(null); reload(); }} />}
    </div>
  );
}

function QueueList({ queue, onOpen }: { queue: QItem[]; onOpen: (b: string, c: number, focus: string) => void }) {
  if (!queue.length) return <p className="mt-6 text-sm text-base-content/70">File vide. La passe alimentera les vrais cas de jugement.</p>;
  return (
    <div className="mt-4 grid gap-2">
      {queue.map((it) => {
        const ch = Number(it.ref.split(":")[0]);
        return (
          <button key={it.book + it.ref} onClick={() => onOpen(it.book, ch, it.ref)}
            className="rounded-box border border-base-300 bg-base-100 p-3.5 text-left transition-colors hover:border-primary/40">
            <div className="flex items-center gap-2">
              <span className={`badge badge-sm ${it.priority <= 1 ? "badge-error" : it.priority <= 2 ? "badge-warning" : "badge-ghost"}`}>
                P{it.priority}
              </span>
              <span className="font-medium">{BOOK[it.book] ?? it.book} {it.ref}</span>
              <span className="text-xs text-base-content/60">· {KINDS[it.kind] ?? it.kind} · 1 clic</span>
            </div>
            {it.reason && <p className="mt-1 text-sm text-base-content/75">{it.reason}</p>}
          </button>
        );
      })}
    </div>
  );
}

function BrowseList({ states, onOpen }: { states: Record<string, Record<string, State>>; onOpen: (b: string, c: number) => void }) {
  return (
    <div className="mt-4 grid gap-4">
      {Object.keys(states).sort().map((book) => {
        const chs = Object.keys(states[book]).map(Number).sort((a, b) => a - b);
        const visible = chs.filter((c) => states[book][c].scaled); // verrou scaled : on ne montre que le scaled
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
                    title={notConv ? "Non convergé — liage manuel (session)" : s.pending ? `${s.pending} arbitrage(s) en attente` : "Auto-résolu"}>
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

function ChapterEditor({ sel, onClose }: { sel: { book: string; ch: number; focus?: string }; onClose: () => void }) {
  const [data, setData] = useState<Chapter | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(async () => {
    const d = await arb<Chapter & { error?: string }>(`/chapter?book=${sel.book}&ch=${sel.ch}`);
    if ((d as { error?: string }).error) setErr((d as { error?: string }).error!);
    else setData(d);
  }, [sel.book, sel.ch]);
  useEffect(() => { load(); }, [load]);

  const notConverged = data?.state.state === "not-converged";
  return (
    <div className="fixed inset-0 z-[80] flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative h-full w-full max-w-3xl overflow-y-auto bg-base-100 p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{BOOK[sel.book] ?? sel.book} {sel.ch}</h2>
          <button className="btn btn-sm btn-ghost" onClick={onClose}>Fermer</button>
        </div>
        {err && <div className="alert alert-error mt-3 text-sm">{err}</div>}
        {notConverged && (
          <div className="alert alert-warning mt-3 text-sm">
            Chapitre <strong>non convergé</strong> : liage manuel verset par verset. Reliez chaque verset grec à son
            (ses) verset(s) Giguet via le picker, ou déclarez-le orphelin.
          </div>
        )}
        {data && (
          <div className="mt-4 grid gap-2">
            {data.rows.map((row) => (
              <VerseRow key={row.ref} book={sel.book} row={row}
                item={data.queueItems.find((q) => q.ref === row.ref)}
                focused={sel.focus === row.ref}
                heavy={!!notConverged}
                onSaved={load} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function VerseRow({ book, row, item, focused, heavy, onSaved }: {
  book: string; row: Row; item?: QItem; focused: boolean; heavy: boolean; onSaved: () => void;
}) {
  const needsEye = !!item || heavy;
  const [editing, setEditing] = useState(focused || heavy);
  return (
    <div className={`rounded-box border p-3 ${focused ? "border-primary" : needsEye ? "border-error/40" : "border-base-300"}`}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 text-xs font-semibold text-base-content/60">{row.v}</span>
        <div className="min-w-0 flex-1">
          <p className="font-greek text-lg leading-snug">{row.greek}</p>
          <p className="mt-1 text-sm leading-relaxed text-base-content/85">
            {row.orphanGreek ? <em className="text-base-content/50">— orphelin grec (aucun français)</em>
              : row.french ?? <em className="text-base-content/50">— grec seul (non arbitré)</em>}
            {row.overridden && <span className="badge badge-xs badge-primary ml-2">Biblion</span>}
          </p>
          {item?.reason && !editing && <p className="mt-1 text-xs text-warning">{item.reason}</p>}
        </div>
        {!editing && needsEye && <button className="btn btn-xs btn-primary" onClick={() => setEditing(true)}>Arbitrer</button>}
        {!editing && !needsEye && <button className="btn btn-xs btn-ghost" onClick={() => setEditing(true)}>Modifier</button>}
      </div>
      {editing && <Resolver book={book} row={row} item={item} onDone={() => { setEditing(false); onSaved(); }} onCancel={() => setEditing(false)} />}
    </div>
  );
}

function Resolver({ book, row, item, onDone, onCancel }: { book: string; row: Row; item?: QItem; onDone: () => void; onCancel: () => void }) {
  const [sources, setSources] = useState<Src[]>(row.sources ?? []);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [gcache, setGcache] = useState<Record<string, string>>({});

  // Cache texte Giguet : charge à la demande le chapitre d'une source (pour l'aperçu).
  const ensureCh = useCallback(async (ch: number) => {
    if (gcache[`${ch}:_loaded`]) return;
    const d = await arb<{ results: { ch: number; v: number; text: string }[] }>(`/search?book=${book}&ch=${ch}`);
    setGcache((c) => { const n = { ...c, [`${ch}:_loaded`]: "1" }; for (const r of d.results) n[`${r.ch}:${r.v}`] = r.text; return n; });
  }, [book, gcache]);
  useEffect(() => { for (const [c] of sources) ensureCh(c); if (item?.proposals) for (const p of item.proposals) for (const [c] of p.sources) ensureCh(Number(c)); }, [sources, item, ensureCh]);

  const preview = sources.map(([c, v]) => gcache[`${c}:${v}`]).filter(Boolean).join(" ");
  const setFrom = (ss: [string, string][]) => setSources(ss.map(([c, v]) => [Number(c), Number(v)] as Src));

  const save = async (revoke = false) => {
    setBusy(true); setErrors([]);
    const d = await arb<{ ok: boolean; errors?: string[] }>("/resolve", {
      method: "POST", body: JSON.stringify(revoke ? { book, ref: row.ref, revoke: true } : { book, ref: row.ref, sources }),
    });
    setBusy(false);
    if (d.ok) onDone(); else setErrors(d.errors ?? ["Échec de l’enregistrement."]);
  };

  return (
    <div className="mt-3 rounded-box bg-base-200 p-3">
      {/* Propositions des lecteurs (chemin léger : 1 clic). */}
      {item?.proposals && (
        <div className="mb-3">
          <div className="text-[0.7rem] font-medium uppercase tracking-wide text-base-content/60">Propositions des lecteurs</div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {item.proposals.map((p) => (
              <button key={p.reader} className="btn btn-xs btn-outline" onClick={() => setFrom(p.sources)}>
                {p.reader} : {p.sources.map((s) => s.join(":")).join(" + ")}
              </button>
            ))}
            {item.proposals.length > 1 && (
              <button className="btn btn-xs btn-outline btn-primary"
                onClick={() => setFrom(Array.from(new Set(item.proposals!.flatMap((p) => p.sources.map((s) => s.join(":"))))).map((k) => k.split(":") as [string, string]))}>
                Fusionner tout
              </button>
            )}
          </div>
        </div>
      )}

      {/* Sources actuelles (chips ordonnés). */}
      <div className="text-[0.7rem] font-medium uppercase tracking-wide text-base-content/60">Versets Giguet liés</div>
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        {sources.length === 0 && <span className="text-xs italic text-base-content/50">orphelin grec (aucun français)</span>}
        {sources.map(([c, v], i) => (
          <span key={i} className="badge badge-neutral gap-1">
            {c}:{v}
            <button onClick={() => setSources((s) => s.filter((_, j) => j !== i))} aria-label="retirer">✕</button>
          </span>
        ))}
        <button className="btn btn-xs btn-ghost" onClick={() => setSources([])}>Orphelin</button>
      </div>

      <GiguetPicker book={book} onAdd={(c, v, text) => { setSources((s) => [...s, [c, v]]); setGcache((g) => ({ ...g, [`${c}:${v}`]: text })); }} />

      {/* Aperçu exact du rendu public. */}
      <div className="mt-3 rounded-box border border-base-300 bg-base-100 p-3">
        <div className="text-[0.7rem] font-medium uppercase tracking-wide text-base-content/60">Aperçu (rendu lecteur)</div>
        <p className="font-greek mt-1 text-lg leading-snug">{row.greek}</p>
        <p className="mt-1 leading-relaxed text-base-content/85">
          <span className="verse-num">{row.v}</span>
          {preview || <em className="text-base-content/40">— grec seul —</em>}
        </p>
      </div>

      {errors.length > 0 && <div className="alert alert-error mt-2 flex-col items-start gap-0.5 text-xs">{errors.map((e, i) => <div key={i}>{e}</div>)}</div>}

      <div className="mt-3 flex flex-wrap gap-2">
        <button className="btn btn-sm btn-primary" disabled={busy} onClick={() => save(false)}>Enregistrer</button>
        {row.overridden && <button className="btn btn-sm btn-ghost text-error" disabled={busy} onClick={() => save(true)}>Révoquer (retour auto)</button>}
        <button className="btn btn-sm btn-ghost" onClick={onCancel}>Annuler</button>
      </div>
    </div>
  );
}

function GiguetPicker({ book, onAdd }: { book: string; onAdd: (ch: number, v: number, text: string) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ ch: number; v: number; text: string }[]>([]);
  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      const d = await arb<{ results: typeof results }>(`/search?book=${book}&q=${encodeURIComponent(q)}`);
      setResults(d.results);
    }, 250);
    return () => clearTimeout(t);
  }, [q, book]);
  return (
    <div className="mt-3">
      <div className="text-[0.7rem] font-medium uppercase tracking-wide text-base-content/60">Chercher un verset Giguet (n’importe où dans le livre)</div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="mot ou phrase du français Giguet…"
        className="input input-bordered input-sm mt-1 w-full" spellCheck={false} autoComplete="off" />
      {results.length > 0 && (
        <div className="mt-1 max-h-48 overflow-y-auto rounded-box border border-base-300">
          {results.map((r) => (
            <button key={`${r.ch}:${r.v}`} onClick={() => { onAdd(r.ch, r.v, r.text); setQ(""); setResults([]); }}
              className="block w-full border-b border-base-200 px-2 py-1.5 text-left text-xs last:border-0 hover:bg-base-200">
              <span className="font-mono text-base-content/60">{r.ch}:{r.v}</span> {r.text.slice(0, 90)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
