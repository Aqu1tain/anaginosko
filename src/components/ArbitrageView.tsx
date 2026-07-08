"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { BiblionQueue, PsalmsQueue, ArchivedSection, SinceLastVisit, ProvenanceBadge } from "./ArbitrageBiblion";

// Outil d'arbitrage des liens grec↔Giguet (réservé philologue/admin). Biblion suit
// la passe : il ne voit et n'agit que sur les chapitres SCALED. Modèle de liens :
// un verset grec -> suite ordonnée de versets Giguet (0 = orphelin, 2+ = scission).
// On ne modifie jamais le texte Giguet ; on ne fait que le câbler.

// Source : verset Giguet entier [ch, v] ou extrait [ch, v, motDébut, motFin]
// (indices 0-based inclusifs ; Giguet fusionne parfois deux versets grecs en un).
type Src = [number, number] | [number, number, number, number];
type State = { scaled: boolean; state: "auto-resolved" | "not-converged" | "pending-scale"; pending: number };
type QItem = {
  book: string; ref: string; kind: string; priority: number; reason?: string; greek?: string;
  proposals?: { reader: string; sources: [string, string][]; orphan?: [string, string][] }[];
};
type Row = { v: number; greek: string; ref: string; sources: Src[] | null; french: string | null; orphanGreek: boolean; overridden: boolean; by?: string | null; provenance?: string | null; maison?: string | null };
type Coverage = {
  greekSide: { v: number; state: "orphan" | "unlinked" }[];
  frenchSide: { ch: number; v: number; part: string; preview: string }[];
};
type Chapter = { book: string; ch: number; state: State; rows: Row[]; queueItems: QItem[]; gigChapters: string[]; coverage: Coverage };
type GigVerse = { ch: number; v: number; text: string; linkedTo?: string | null; partial?: boolean };

const srcLabel = (s: Src) => (s.length === 4 ? `${s[0]}:${s[1]} · mots ${s[2] + 1}-${s[3] + 1}` : `${s[0]}:${s[1]}`);
const srcText = (s: Src, whole: string | undefined) => {
  if (whole == null) return undefined;
  if (s.length === 2) return whole;
  return whole.split(/\s+/).filter(Boolean).slice(s[2], s[3] + 1).join(" ");
};

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
  const [tab, setTab] = useState<"biblion" | "psalms" | "archived" | "queue" | "browse">("biblion");
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

  // Deep-link depuis le lecteur : /admin/arbitrage?book=<id>&ch=<n> ouvre le chapitre.
  useEffect(() => {
    if (!editor) return;
    const sp = new URLSearchParams(window.location.search);
    const book = sp.get("book");
    const ch = Number(sp.get("ch"));
    if (book && Number.isInteger(ch)) setOpen({ book, ch });
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
      <p className="mt-1 max-w-prose text-sm text-base-content/70">
        Le grec (Rahlfs) est la colonne autoritaire. Vous reliez chaque verset grec à un ou plusieurs
        versets Giguet ; jamais vous n’en modifiez le texte. Vous n’agissez que sur les chapitres déjà
        passés par l’alignement (scaled) ; les autres sont verrouillés.
      </p>
      {err && <div className="alert alert-warning mt-3 text-sm">{err}</div>}
      <SinceLastVisit />

      <div role="tablist" className="tabs tabs-boxed mt-4 w-fit">
        <button className={`tab ${tab === "biblion" ? "tab-active" : ""}`} onClick={() => setTab("biblion")}>À arbitrer</button>
        <button className={`tab ${tab === "psalms" ? "tab-active" : ""}`} onClick={() => setTab("psalms")}>Suscriptions</button>
        <button className={`tab ${tab === "archived" ? "tab-active" : ""}`} onClick={() => setTab("archived")}>Archivées</button>
        <button className={`tab ${tab === "queue" ? "tab-active" : ""}`} onClick={() => setTab("queue")}>
          File (ancienne) <span className="badge badge-sm ml-2">{queue.length}</span>
        </button>
        <button className={`tab ${tab === "browse" ? "tab-active" : ""}`} onClick={() => setTab("browse")}>Parcourir</button>
      </div>

      {tab === "biblion" && <BiblionQueue onOpenChapter={(book, ch, focus) => setOpen({ book, ch, focus })} />}
      {tab === "psalms" && <PsalmsQueue />}
      {tab === "archived" && <ArchivedSection />}
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
                    title={notConv ? "Non convergé : liage manuel (session)" : s.pending ? `${s.pending} arbitrage(s) en attente` : "Auto-résolu"}>
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
        {/* Alerte de couverture : rien ne doit rester orphelin sans décision. */}
        {data && (data.coverage.greekSide.length > 0 || data.coverage.frenchSide.length > 0) && (
          <div className="alert alert-warning mt-3 flex-col items-start gap-1 text-sm">
            <span className="font-semibold">Couverture incomplète</span>
            {data.coverage.greekSide.length > 0 && (
              <span>
                Versets grecs sans français :{" "}
                {data.coverage.greekSide.map((g) => `${g.v}${g.state === "orphan" ? " (orphelin déclaré)" : ""}`).join(", ")}
              </span>
            )}
            {data.coverage.frenchSide.map((f, i) => (
              <span key={i}>
                Giguet {f.ch}:{f.v} non lié ({f.part}) : « {f.preview} »
              </span>
            ))}
          </div>
        )}
        {data && (
          <div className="mt-4 grid gap-2">
            {data.rows.map((row) => (
              <VerseRow key={row.ref} book={sel.book} row={row}
                item={data.queueItems.find((q) => q.ref === row.ref)}
                focused={sel.focus === row.ref}
                heavy={!!notConverged}
                gigChapters={data.gigChapters}
                defaultCh={String(sel.ch)}
                onSaved={load} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function VerseRow({ book, row, item, focused, heavy, gigChapters, defaultCh, onSaved }: {
  book: string; row: Row; item?: QItem; focused: boolean; heavy: boolean;
  gigChapters: string[]; defaultCh: string; onSaved: () => void;
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
            {row.orphanGreek ? <em className="text-base-content/50">orphelin grec (aucun français)</em>
              : row.french ?? <em className="text-base-content/50">grec seul (non arbitré)</em>}
            {row.overridden && <span className="ml-2 inline-flex align-middle"><ProvenanceBadge by={row.by} provenance={row.provenance} maison={row.maison} /></span>}
          </p>
          {item?.reason && !editing && <p className="mt-1 text-xs text-warning">{item.reason}</p>}
        </div>
        {!editing && needsEye && <button className="btn btn-xs btn-primary" onClick={() => setEditing(true)}>Arbitrer</button>}
        {!editing && !needsEye && <button className="btn btn-xs btn-ghost" onClick={() => setEditing(true)}>Modifier</button>}
      </div>
      {editing && (
        <Resolver book={book} row={row} item={item} gigChapters={gigChapters} defaultCh={defaultCh}
          onDone={() => { setEditing(false); onSaved(); }} onCancel={() => setEditing(false)} />
      )}
    </div>
  );
}

function Resolver({ book, row, item, gigChapters, defaultCh, onDone, onCancel }: {
  book: string; row: Row; item?: QItem; gigChapters: string[]; defaultCh: string;
  onDone: () => void; onCancel: () => void;
}) {
  const [sources, setSources] = useState<Src[]>(row.sources ?? []);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [gcache, setGcache] = useState<Record<string, string>>({});

  // Lier/délier un verset Giguet ENTIER depuis le panneau de parcours. Si des
  // extraits de ce verset sont déjà liés, le clic les remplace/retire d'un bloc.
  const toggle = (c: number, v: number, text: string) => {
    setSources((s) => (s.some((x) => x[0] === c && x[1] === v) ? s.filter((x) => !(x[0] === c && x[1] === v)) : [...s, [c, v]]));
    setGcache((g) => ({ ...g, [`${c}:${v}`]: text }));
  };
  // Lier un EXTRAIT (plage de mots) d'un verset Giguet.
  const addSpan = (c: number, v: number, from: number, to: number, text: string) => {
    setSources((s) => [...s.filter((x) => !(x.length === 2 && x[0] === c && x[1] === v)), [c, v, from, to]]);
    setGcache((g) => ({ ...g, [`${c}:${v}`]: text }));
  };

  // Cache texte Giguet : charge à la demande le chapitre d'une source (pour l'aperçu).
  const ensureCh = useCallback(async (ch: number) => {
    if (gcache[`${ch}:_loaded`]) return;
    const d = await arb<{ results: { ch: number; v: number; text: string }[] }>(`/search?book=${book}&ch=${ch}`);
    setGcache((c) => { const n = { ...c, [`${ch}:_loaded`]: "1" }; for (const r of d.results) n[`${r.ch}:${r.v}`] = r.text; return n; });
  }, [book, gcache]);
  useEffect(() => { for (const [c] of sources) ensureCh(c); if (item?.proposals) for (const p of item.proposals) for (const [c] of p.sources) ensureCh(Number(c)); }, [sources, item, ensureCh]);

  const preview = sources.map((s) => srcText(s, gcache[`${s[0]}:${s[1]}`])).filter(Boolean).join(" ");
  const setFrom = (ss: [string, string][]) => setSources(ss.map(([c, v]) => [Number(c), Number(v)] as Src));

  // Alerte de NON-PAVAGE : pour chaque verset Giguet couvert seulement par des extraits,
  // les mots restants (non pris par ce lien) sont affichés AVANT validation. C'est le
  // garde-fou contre l'Écriture amputée (ex. la queue sir 36:16 perdue). Non bloquant :
  // ces mots peuvent légitimement servir un autre verset grec, mais Biblion doit le voir.
  const uncovered = useMemo(() => {
    const byVerse = new Map<string, { whole: boolean; spans: [number, number][]; text?: string }>();
    for (const s of sources) {
      const k = `${s[0]}:${s[1]}`;
      if (!byVerse.has(k)) byVerse.set(k, { whole: false, spans: [], text: gcache[k] });
      const e = byVerse.get(k)!;
      if (s.length === 2) e.whole = true; else e.spans.push([s[2], s[3]]);
    }
    const out: { ref: string; words: string; count: number }[] = [];
    for (const [k, e] of byVerse) {
      if (e.whole || !e.text) continue;
      const words = e.text.split(/\s+/).filter(Boolean);
      const cov = new Array(words.length).fill(false);
      for (const [f, t] of e.spans) for (let i = Math.max(0, f); i <= Math.min(t, words.length - 1); i++) cov[i] = true;
      const gaps: string[] = [];
      let n = 0;
      for (let i = 0, st = -1; i <= words.length; i++) {
        if (i < words.length && !cov[i]) { if (st < 0) st = i; }
        else if (st >= 0) { gaps.push(words.slice(st, i).join(" ")); n += i - st; st = -1; }
      }
      if (n > 0) out.push({ ref: k, words: gaps.join(" … "), count: n });
    }
    return out;
  }, [sources, gcache]);

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
        {sources.map((s, i) => (
          <span key={i} className="badge badge-neutral gap-1">
            {srcLabel(s)}
            <button onClick={() => setSources((x) => x.filter((_, j) => j !== i))} aria-label="retirer">✕</button>
          </span>
        ))}
        <button className="btn btn-xs btn-ghost" onClick={() => setSources([])}>Orphelin</button>
      </div>

      <GiguetPicker book={book} currentRef={row.ref} gigChapters={gigChapters} defaultCh={defaultCh}
        selected={sources} onToggle={toggle} onAddSpan={addSpan} />

      {/* Aperçu exact du rendu public. */}
      <div className="mt-3 rounded-box border border-base-300 bg-base-100 p-3">
        <div className="text-[0.7rem] font-medium uppercase tracking-wide text-base-content/60">Aperçu (rendu lecteur)</div>
        <p className="font-greek mt-1 text-lg leading-snug">{row.greek}</p>
        <p className="mt-1 leading-relaxed text-base-content/85">
          <span className="verse-num">{row.v}</span>
          {preview || <em className="text-base-content/40">grec seul</em>}
        </p>
      </div>

      {uncovered.length > 0 && (
        <div className="alert alert-warning mt-2 flex-col items-start gap-0.5 text-xs">
          <span className="font-semibold">Mots Giguet non couverts par ce lien</span>
          {uncovered.map((u) => (
            <div key={u.ref}>Giguet {u.ref} : {u.count} mot(s) restant(s) — « {u.words} ». Vérifie qu'ils servent un autre verset grec (sinon Écriture amputée).</div>
          ))}
        </div>
      )}

      {errors.length > 0 && <div className="alert alert-error mt-2 flex-col items-start gap-0.5 text-xs">{errors.map((e, i) => <div key={i}>{e}</div>)}</div>}

      <div className="mt-3 flex flex-wrap gap-2">
        <button className="btn btn-sm btn-primary" disabled={busy} onClick={() => save(false)}>Enregistrer</button>
        {row.overridden && <button className="btn btn-sm btn-ghost text-error" disabled={busy} onClick={() => save(true)}>Révoquer (retour auto)</button>}
        <button className="btn btn-sm btn-ghost" onClick={onCancel}>Annuler</button>
      </div>
    </div>
  );
}

// Panneau Giguet : on FEUILLETTE la traduction en contexte (chapitre par chapitre,
// versets entiers) et on clique pour lier/délier ; la recherche plein texte est le
// chemin secondaire. Les versets déjà liés ailleurs sont signalés, pas cachés.
function GiguetPicker({ book, currentRef, gigChapters, defaultCh, selected, onToggle, onAddSpan }: {
  book: string; currentRef: string; gigChapters: string[]; defaultCh: string;
  selected: Src[]; onToggle: (ch: number, v: number, text: string) => void;
  onAddSpan: (ch: number, v: number, from: number, to: number, text: string) => void;
}) {
  const [ch, setCh] = useState(gigChapters.includes(defaultCh) ? defaultCh : gigChapters[0]);
  const [q, setQ] = useState("");
  const [verses, setVerses] = useState<GigVerse[]>([]);
  const [results, setResults] = useState<GigVerse[]>([]);
  // Mode extrait : verset déplié en mots ; 1er clic = début, 2e clic = fin.
  const [extract, setExtract] = useState<{ key: string; start: number | null } | null>(null);
  const selKeys = new Set(selected.map((s) => `${s[0]}:${s[1]}`));
  const searching = q.trim().length >= 2;

  useEffect(() => {
    let alive = true;
    arb<{ results: GigVerse[] }>(`/search?book=${book}&ch=${ch}`).then((d) => { if (alive) setVerses(d.results || []); });
    return () => { alive = false; };
  }, [book, ch]);

  useEffect(() => {
    if (!searching) { setResults([]); return; }
    const t = setTimeout(async () => {
      const d = await arb<{ results: GigVerse[] }>(`/search?book=${book}&q=${encodeURIComponent(q)}`);
      setResults(d.results || []);
    }, 250);
    return () => clearTimeout(t);
  }, [q, book, searching]);

  const chIdx = gigChapters.indexOf(ch);
  const rows = searching ? results : verses;

  return (
    <div className="mt-3 overflow-hidden rounded-box border border-base-300 bg-base-100">
      <div className="flex flex-wrap items-center gap-2 border-b border-base-200 px-2.5 py-2">
        <span className="text-[0.7rem] font-medium uppercase tracking-wide text-base-content/60">Giguet</span>
        <input value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Chercher dans tout le livre…"
          className="input input-bordered input-xs min-w-0 flex-1"
          spellCheck={false} autoComplete="off" />
        {!searching && (
          <div className="join">
            <button type="button" className="btn btn-xs join-item" disabled={chIdx <= 0}
              onClick={() => setCh(gigChapters[chIdx - 1])} aria-label="Chapitre précédent">‹</button>
            <select className="select select-xs join-item" value={ch} onChange={(e) => setCh(e.target.value)}
              aria-label="Chapitre Giguet">
              {gigChapters.map((c) => <option key={c} value={c}>ch. {c}</option>)}
            </select>
            <button type="button" className="btn btn-xs join-item" disabled={chIdx < 0 || chIdx >= gigChapters.length - 1}
              onClick={() => setCh(gigChapters[chIdx + 1])} aria-label="Chapitre suivant">›</button>
          </div>
        )}
      </div>

      <div className="max-h-72 overflow-y-auto">
        {rows.map((r) => {
          const key = `${r.ch}:${r.v}`;
          const isSel = selKeys.has(key);
          const elsewhere = r.linkedTo && r.linkedTo !== currentRef;
          const inExtract = extract?.key === key;

          if (inExtract) {
            const words = r.text.split(/\s+/).filter(Boolean);
            return (
              <div key={key} className="border-l-2 border-accent bg-accent/5 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[0.7rem] font-medium uppercase tracking-wide text-accent">
                    Extrait de {r.ch}:{r.v} : {extract.start == null ? "touchez le PREMIER mot" : "touchez le DERNIER mot"}
                  </span>
                  <button type="button" className="btn btn-ghost btn-xs" onClick={() => setExtract(null)}>Annuler</button>
                </div>
                <p className="mt-1.5 text-sm leading-loose">
                  {words.map((w, i) => (
                    <button key={i} type="button"
                      onClick={() => {
                        if (extract.start == null) setExtract({ key, start: i });
                        else {
                          const [from, to] = extract.start <= i ? [extract.start, i] : [i, extract.start];
                          onAddSpan(r.ch, r.v, from, to, r.text);
                          setExtract(null);
                        }
                      }}
                      className={`mr-1 rounded px-0.5 transition-colors hover:bg-accent/25 ${
                        extract.start != null && i === extract.start ? "bg-accent text-accent-content" : ""
                      }`}>
                      {w}
                    </button>
                  ))}
                </p>
              </div>
            );
          }

          return (
            <div key={key} className={`group flex items-start border-l-2 transition-colors ${
              isSel ? "border-primary bg-primary/10" : "border-transparent hover:bg-base-200"
            }`}>
              <button type="button" onClick={() => onToggle(r.ch, r.v, r.text)}
                title={isSel ? "Cliquer pour délier" : elsewhere ? `Déjà lié au grec ${r.linkedTo} : le lier ici demandera une réattribution` : "Cliquer pour lier le verset entier"}
                className="min-w-0 flex-1 px-3 py-2 text-left text-sm leading-relaxed">
                <span className={`verse-num ${isSel ? "text-primary" : ""}`}>{searching ? `${r.ch}:${r.v}` : r.v}</span>
                <span className={elsewhere && !isSel ? "text-base-content/45" : "text-base-content/85"}>{r.text}</span>
                {elsewhere && (
                  <span className="badge badge-ghost badge-xs ml-1.5 align-middle">
                    → grec {r.linkedTo}{r.partial ? " (extrait)" : ""}
                  </span>
                )}
              </button>
              <button type="button"
                onClick={() => setExtract({ key, start: null })}
                title="Lier seulement une partie du verset (plage de mots)"
                className="btn btn-ghost btn-xs mr-1 mt-1.5 shrink-0 text-accent">
                Extrait
              </button>
            </div>
          );
        })}
        {rows.length === 0 && (
          <p className="px-3 py-4 text-xs text-base-content/50">
            {searching ? "Aucun verset ne correspond." : "Chapitre vide."}
          </p>
        )}
      </div>
    </div>
  );
}
