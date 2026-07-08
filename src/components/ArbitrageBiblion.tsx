"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

// Sections de l'outil d'arbitrage dédiées à la revue de Biblion (Phase 2) : file
// « À arbitrer » (292 divergences), suscriptions maison (28), archivées, et l'encart
// « depuis ta dernière visite ». On écrit toujours via /resolve (format standard,
// by + horodatage, matérialiseur unique) ; jamais de donnée hors ARB_DIR.

type Src = [number, number] | [number, number, number, number];
export type Prop = {
  disposition: string; sources?: Src[]; sourcesEtendues?: Src[]; rattacheGrec?: string | null;
  grec?: string; preuve?: string; confiance?: string; cible: string | null; apercu: string | null;
};
export type BCase = {
  book: string; cause: string; grec?: string; giguet?: string; greek?: string | null; giguetText?: string | null;
  sources?: Src[]; quarantaineApercu?: string | null; preuve?: string; a: Prop | null; b: Prop | null;
};
type QueueResp = { queue: BCase[]; total: number; open: number; done: number; byBook: Record<string, number>; byCause: Record<string, number>; reviewer?: string };
type Psalm = { ref: string; grec: string; accord: boolean; maison_A: string; maison_B: string; choix: string | null; decomposition: string; confiance: string[]; servie: string | null };
type Archived = { book: string; ref: string; sources: Src[]; greek: string | null; reason: string; at: string | null; message: string };

const API = "/admin/arbitrage/api";
const token = () => (typeof window !== "undefined" ? localStorage.getItem("anaginosko:token") : null);
export async function arb<T>(p: string, opts?: RequestInit): Promise<T> {
  const r = await fetch(`${API}${p}`, { ...opts, headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json", ...(opts?.headers || {}) } });
  return r.json();
}

export const BOOK: Record<string, string> = {
  gen: "Genèse", exo: "Exode", num: "Nombres", deu: "Deutéronome", jos: "Josué", "1sa": "1 Samuel", "1ki": "1 Rois",
  "1ch": "1 Chroniques", "2ch": "2 Chroniques", neh: "Néhémie", job: "Job", psa: "Psaumes", pro: "Proverbes",
  sir: "Siracide", isa: "Isaïe", jer: "Jérémie", ezk: "Ézéchiel", jol: "Joël", jdt: "Judith", tob: "Tobie",
  bar: "Baruch", "2ma": "2 Maccabées", sng: "Cantique", sus: "Suzanne",
};
const CAUSE: Record<string, string> = {
  "sources": "Sources divergentes", "disposition": "Disposition divergente", "un seul témoin": "Un seul témoin",
  "trou: un seul témoin": "Trou · un témoin", "trou: rattachement": "Trou · rattachement",
  "quarantaine zéro-perte (cascade incomplète)": "Quarantaine (cascade)", "à-traduire dans chapitre non résolu": "À traduire (chapitre non résolu)",
};
const srcLabel = (s: Src) => (s.length === 4 ? `${s[0]}:${s[1]}·mots ${s[2] + 1}-${s[3] + 1}` : `${s[0]}:${s[1]}`);

// Badge de provenance, lisible d'un coup d'œil.
export function ProvenanceBadge({ by, provenance, maison }: { by?: string | null; provenance?: string | null; maison?: string | null }) {
  if (maison) return <span className="badge badge-sm badge-secondary">maison</span>;
  if (by === "Βιβλίον" || provenance === "biblion") return <span className="badge badge-sm badge-primary">Βιβλίον</span>;
  if (provenance === "phase2-convergence") return <span className="badge badge-sm badge-accent">convergence Φ2</span>;
  if (by) return <span className="badge badge-sm badge-ghost">{by}</span>;
  return null;
}

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

// ─────────────────────────────── File « À arbitrer » (292) ───────────────────────────────
export function BiblionQueue({ onOpenChapter }: { onOpenChapter: (book: string, ch: number, focus: string) => void }) {
  const [resp, setResp] = useState<QueueResp | null>(null);
  const [fBook, setFBook] = useState(""); const [fCause, setFCause] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const reload = useCallback(async () => {
    const qs = new URLSearchParams(); if (fBook) qs.set("book", fBook); if (fCause) qs.set("cause", fCause);
    const d = await arb<QueueResp & { error?: string }>(`/biblion-queue?${qs}`);
    if ((d as { error?: string }).error) setErr((d as { error?: string }).error!); else { setResp(d); setErr(null); }
  }, [fBook, fCause]);
  useEffect(() => { reload(); }, [reload]);

  if (err) return <div className="alert alert-warning mt-4 text-sm">{err}</div>;
  if (!resp) return <p className="mt-6 text-sm text-base-content/60">Chargement…</p>;

  const done = resp.total - resp.open;
  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-sm">
          <span className="font-semibold text-primary">{done}</span>
          <span className="text-base-content/60"> / {resp.total} tranchés · </span>
          <span className="font-semibold">{resp.open}</span>
          <span className="text-base-content/60"> restants</span>
        </div>
        <progress className="progress progress-primary w-40" value={done} max={resp.total} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <select className="select select-bordered select-sm" value={fBook} onChange={(e) => setFBook(e.target.value)}>
          <option value="">Tous les livres ({resp.open})</option>
          {Object.entries(resp.byBook).sort((a, b) => b[1] - a[1]).map(([b, n]) => <option key={b} value={b}>{BOOK[b] ?? b} ({n})</option>)}
        </select>
        <select className="select select-bordered select-sm" value={fCause} onChange={(e) => setFCause(e.target.value)}>
          <option value="">Toutes les causes</option>
          {Object.entries(resp.byCause).sort((a, b) => b[1] - a[1]).map(([c, n]) => <option key={c} value={c}>{CAUSE[c] ?? c} ({n})</option>)}
        </select>
        {(fBook || fCause) && <button className="btn btn-sm btn-ghost" onClick={() => { setFBook(""); setFCause(""); }}>Réinitialiser</button>}
      </div>

      {resp.queue.length === 0 && <p className="mt-6 text-sm text-base-content/60">Rien à arbitrer dans ce filtre.</p>}
      <div className="mt-4 grid gap-3">
        {resp.queue.slice(0, 60).map((c, i) => <CaseCard key={c.book + (c.grec || c.giguet) + i} c={c} onDone={reload} onOpenChapter={onOpenChapter} />)}
      </div>
      {resp.queue.length > 60 && <p className="mt-4 text-xs text-base-content/50">… {resp.queue.length - 60} autres (affine par livre/cause).</p>}
    </div>
  );
}

function CaseCard({ c, onDone, onOpenChapter }: { c: BCase; onDone: () => void; onOpenChapter: (b: string, ch: number, focus: string) => void }) {
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string[] | null>(null);
  const grecRef = c.grec || c.a?.cible || c.b?.cible || null;
  const ch = Number((grecRef || c.giguet || "0").split(":")[0]);

  const adopt = async (p: Prop | null) => {
    if (!p || !p.cible) return;
    setBusy(true); setErr(null);
    const sources = p.sourcesEtendues || p.sources || [];
    const d = await arb<{ ok: boolean; errors?: string[] }>("/resolve", { method: "POST", body: JSON.stringify({ book: c.book, ref: p.cible, sources }) });
    setBusy(false);
    if (d.ok) onDone(); else setErr(d.errors || ["Échec."]);
  };
  const classer = async (decision: string) => {
    setBusy(true); setErr(null);
    const d = await arb<{ ok: boolean }>("/dismiss", { method: "POST", body: JSON.stringify({ book: c.book, key: c.grec || c.giguet, decision }) });
    setBusy(false);
    if (d.ok) onDone(); else setErr(["Échec du classement."]);
  };
  const isTitre = c.a?.disposition === "titre" || c.b?.disposition === "titre";
  const isMarqueur = c.a?.disposition === "marqueur" || c.b?.disposition === "marqueur";

  return (
    <div className="rounded-box border border-base-300 bg-base-100 p-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{BOOK[c.book] ?? c.book} {c.grec || c.giguet}</span>
        <span className="badge badge-sm badge-ghost">{CAUSE[c.cause] ?? c.cause}</span>
      </div>
      {c.greek && <p className="font-greek mt-1.5 text-lg leading-snug">{c.greek}</p>}
      {c.giguetText && !c.greek && <p className="mt-1.5 text-sm italic text-base-content/70">Giguet : « {c.giguetText} »</p>}

      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {(["a", "b"] as const).map((k) => {
          const p = c[k]; if (!p) return null;
          return (
            <div key={k} className="rounded-box border border-base-200 bg-base-200/40 p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-base-content/60">
                Lecteur {k.toUpperCase()} · {p.disposition}
                {p.confiance && <span className={`badge badge-xs ${p.confiance === "haute" ? "badge-success" : "badge-warning"}`}>{p.confiance}</span>}
              </div>
              {p.cible && <div className="mt-1 text-xs text-base-content/70">→ grec {p.cible} · {(p.sourcesEtendues || p.sources || []).map(srcLabel).join(" + ") || "orphelin"}</div>}
              {p.apercu && <p className="mt-1 text-sm leading-relaxed">« {p.apercu} »</p>}
              {p.preuve && <p className="mt-1 text-xs text-base-content/55">{p.preuve.length > 220 ? p.preuve.slice(0, 220) + "…" : p.preuve}</p>}
              {p.cible && !isTitre && !isMarqueur && <button className="btn btn-xs btn-primary mt-2" disabled={busy} onClick={() => adopt(p)}>Adopter {k.toUpperCase()}</button>}
            </div>
          );
        })}
      </div>

      {c.quarantaineApercu && <p className="mt-2 text-sm">Proposition (quarantaine) : « {c.quarantaineApercu} »</p>}
      {c.preuve && !c.a && !c.b && <p className="mt-1 text-xs text-base-content/55">{c.preuve.slice(0, 260)}</p>}

      {err && <div className="alert alert-error mt-2 flex-col items-start gap-0.5 text-xs">{err.map((e, i) => <div key={i}>{e}</div>)}</div>}

      <div className="mt-2.5 flex flex-wrap gap-2">
        {Number.isInteger(ch) && grecRef && (
          <button className="btn btn-xs btn-outline" disabled={busy} onClick={() => onOpenChapter(c.book, ch, grecRef)}>Ma propre découpe (éditeur)</button>
        )}
        {isTitre && <button className="btn btn-xs btn-secondary btn-outline" disabled={busy} onClick={() => classer("titre-kan55")}>C'est un titre (KAN-55)</button>}
        {isMarqueur && <button className="btn btn-xs btn-secondary btn-outline" disabled={busy} onClick={() => classer("marqueur-exclu")}>Marqueur (exclure)</button>}
      </div>
    </div>
  );
}

// ─────────────────────────────── Suscriptions maison (28) ───────────────────────────────
export function PsalmsQueue() {
  const [list, setList] = useState<Psalm[] | null>(null);
  const reload = useCallback(async () => { const d = await arb<{ suscriptions: Psalm[] }>("/psalms"); setList(d.suscriptions || []); }, []);
  useEffect(() => { reload(); }, [reload]);
  if (!list) return <p className="mt-6 text-sm text-base-content/60">Chargement…</p>;
  const served = list.filter((p) => p.servie).length;
  return (
    <div className="mt-4">
      <p className="text-sm text-base-content/70">Suscriptions omises par Giguet, traduites en maison via son propre gabarit. <span className="font-semibold text-primary">{served}</span> / {list.length} servies.</p>
      <div className="mt-3 grid gap-3">
        {list.map((p) => <PsalmCard key={p.ref} p={p} onDone={reload} />)}
      </div>
    </div>
  );
}

function PsalmCard({ p, onDone }: { p: Psalm; onDone: () => void }) {
  const [text, setText] = useState(p.servie || p.choix || p.maison_A);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string[] | null>(null);
  const save = async () => {
    setBusy(true); setErr(null);
    const d = await arb<{ ok: boolean; errors?: string[] }>("/resolve", { method: "POST", body: JSON.stringify({ book: "psa", ref: p.ref, sources: [], maison: text }) });
    setBusy(false);
    if (d.ok) onDone(); else setErr(d.errors || ["Échec."]);
  };
  return (
    <div className="rounded-box border border-base-300 bg-base-100 p-3.5">
      <div className="flex items-center gap-2">
        <span className="font-medium">Psaume {p.ref}</span>
        {p.servie ? <span className="badge badge-sm badge-secondary">maison · servie</span> : <span className="badge badge-sm badge-ghost">à valider</span>}
        {p.accord && <span className="badge badge-xs badge-success">témoins d'accord</span>}
      </div>
      <p className="font-greek mt-1.5 text-lg leading-snug">{p.grec}</p>
      <div className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
        <button className="rounded border border-base-200 p-2 text-left hover:border-primary/40" onClick={() => setText(p.maison_A)}><span className="text-xs uppercase text-base-content/50">Témoin A</span><br />{p.maison_A}</button>
        <button className="rounded border border-base-200 p-2 text-left hover:border-primary/40" onClick={() => setText(p.maison_B)}><span className="text-xs uppercase text-base-content/50">Témoin B</span><br />{p.maison_B}</button>
      </div>
      <p className="mt-1.5 text-xs text-base-content/55">{p.decomposition}</p>
      <textarea className="textarea textarea-bordered mt-2 w-full text-sm" rows={2} value={text} onChange={(e) => setText(e.target.value)} />
      {err && <div className="alert alert-error mt-2 text-xs">{err.join(" ")}</div>}
      <button className="btn btn-sm btn-primary mt-2" disabled={busy || !text.trim()} onClick={save}>Servir cette traduction (maison)</button>
    </div>
  );
}

// ─────────────────────────────── Archivées ───────────────────────────────
export function ArchivedSection() {
  const [entries, setEntries] = useState<Archived[] | null>(null);
  useEffect(() => { arb<{ entries: Archived[] }>("/archived").then((d) => setEntries(d.entries || [])).catch(() => setEntries([])); }, []);
  if (!entries) return <p className="mt-6 text-sm text-base-content/60">Chargement…</p>;
  if (!entries.length) return <p className="mt-6 text-sm text-base-content/60">Aucune entrée archivée.</p>;
  const msg = entries[0]?.message;
  return (
    <div className="mt-4">
      {msg && <div className="alert alert-success mb-3 text-sm">{msg}</div>}
      <div className="grid gap-2">
        {entries.map((e) => (
          <div key={e.book + e.ref} className="rounded-box border border-base-300 bg-base-100 p-3">
            <div className="flex items-center gap-2 text-sm"><span className="font-medium">{BOOK[e.book] ?? e.book} {e.ref}</span><span className="text-xs text-base-content/50">archivé {e.at || ""} · anciennes sources {e.sources.map(srcLabel).join(", ")}</span></div>
            {e.greek && <p className="font-greek mt-1 text-base leading-snug text-base-content/80">{e.greek}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
