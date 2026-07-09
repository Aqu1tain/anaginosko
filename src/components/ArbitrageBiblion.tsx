"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

// Sections de l'outil d'arbitrage dédiées à la revue de Biblion (Phase 2) : file
// « À arbitrer » (292 divergences), suscriptions maison (28), archivées, et l'encart
// « depuis ta dernière visite ». On écrit toujours via /resolve (format standard,
// by + horodatage, matérialiseur unique) ; jamais de donnée hors ARB_DIR.

type Src = [number, number] | [number, number, number, number];
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
export function PsalmsQueue() {
  const [list, setList] = useState<Psalm[] | null>(null);
  const reload = useCallback(async () => { const d = await arb<{ suscriptions: Psalm[] }>("/psalms"); setList(d.suscriptions || []); }, []);
  useEffect(() => { reload(); }, [reload]);
  if (!list) return <p className="mt-6 text-sm text-base-content/60">Chargement…</p>;
  const served = list.filter((p) => p.servie).length;
  const todo = list.filter((p) => !p.servie); // servies = traitées -> sorties de la liste
  return (
    <div className="mt-4">
      <p className="text-sm text-base-content/70">Suscriptions omises par Giguet, traduites en maison via son propre gabarit. <span className="font-semibold text-primary">{served}</span> / {list.length} servies.</p>
      {todo.length === 0 ? (
        <p className="mt-4 text-sm text-success">Toutes les suscriptions sont servies.</p>
      ) : (
        <div className="mt-3 grid gap-3">
          {todo.map((p) => <PsalmCard key={p.ref} p={p} onDone={reload} />)}
        </div>
      )}
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
