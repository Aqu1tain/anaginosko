"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { arb, BOOK } from "./ArbitrageBiblion";

// Refonte : carte des erreurs (où corriger) + réalignement DEUX COLONNES d'un chapitre.
// Le grec est fixe (gauche) ; le français Giguet est une bande glissable (droite) qui
// déborde sur les chapitres voisins. On fait glisser d'un cran pour tout recaler ; seul
// le chapitre affiché est enregistré. Les divergences de lecteurs = simple drapeau.

type Src = [number, number] | [number, number, number, number];
type Grec = { v: number; greek: string; ref: string; source: Src[]; giguet: { ch: number; v: number } | null; french: string | null; maison: string | null; by: string | null; overridden: boolean; flagged: boolean; validated: boolean };
type Band = { ch: number; v: number; text: string };
type RealignData = { book: string; ch: number; grec: Grec[]; band: Band[]; chapterFirstIndex: number };
type Overview = { books: { book: string; label: string; total: number; chapters: { ch: number; count: number }[] }[]; grandTotal: number };

// Affectation de travail d'un verset grec : indice dans la bande, orphelin, maison, ou
// "garder" (source complexe d'origine : extrait/multi, qu'on ne touche pas au glissement).
// "extract" : une PLAGE DE MOTS d'un verset Giguet (Giguet fusionne parfois deux
// versets grecs en un ; chaque grec prend alors sa part). ch/v = le verset Giguet,
// from/to = indices de mots 0-based inclusifs.
type Assign = { kind: "band"; index: number } | { kind: "extract"; ch: number; v: number; from: number; to: number } | { kind: "orphan" } | { kind: "maison"; text: string } | { kind: "keep" };

// ───────────────────────── Carte des erreurs (accueil) ─────────────────────────
export function ErrorMap({ onOpen }: { onOpen: (book: string, ch: number) => void }) {
  const [data, setData] = useState<Overview | null>(null);
  const [openBook, setOpenBook] = useState<string | null>(null);
  useEffect(() => { arb<Overview>("/overview").then(setData).catch(() => {}); }, []);
  if (!data) return <p className="mt-6 text-sm text-base-content/60">Chargement…</p>;
  if (!data.books.length) return <p className="mt-6 text-sm text-success">Tout est aligné. Rien à revoir.</p>;
  return (
    <div className="mt-4">
      <p className="text-sm text-base-content/70"><span className="font-semibold text-primary">{data.grandTotal}</span> versets à revoir, dans {data.books.length} livres. Le reste est aligné.</p>
      <div className="mt-3 grid gap-2">
        {data.books.map((b) => (
          <div key={b.book} className="overflow-hidden rounded-box border border-base-300 bg-base-100">
            <button className="flex w-full items-center justify-between px-3.5 py-3 text-left hover:bg-base-200" onClick={() => setOpenBook(openBook === b.book ? null : b.book)}>
              <span className="font-medium">{b.label}</span>
              <span className="flex items-center gap-2"><span className="badge badge-warning badge-sm">{b.total} à revoir</span><span className="text-xs text-base-content/50">{openBook === b.book ? "▲" : "▼"}</span></span>
            </button>
            {openBook === b.book && (
              <div className="flex flex-wrap gap-1.5 border-t border-base-200 p-2.5">
                {b.chapters.map((c) => (
                  <button key={c.ch} className="btn btn-sm btn-outline" onClick={() => onOpen(b.book, c.ch)}>
                    ch. {c.ch} <span className="badge badge-xs badge-warning ml-1">{c.count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ───────────────────────── Réalignement deux colonnes ─────────────────────────
export function ChapterRealign({ book, ch, onClose }: { book: string; ch: number; onClose: () => void }) {
  const [data, setData] = useState<RealignData | null>(null);
  const [assign, setAssign] = useState<Assign[]>([]);
  const [orig, setOrig] = useState<Assign[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string[] | null>(null);
  const [focus, setFocus] = useState<number | null>(null);
  const [extractMode, setExtractMode] = useState<{ i: number; start: number | null } | null>(null); // sélection d'une plage de mots
  const [valid, setValid] = useState<Set<string>>(new Set()); // versets « vérifiés, c'est bon » (local, reflète l'API)
  const toggleValid = async (ref: string) => {
    const on = !valid.has(ref);
    setValid((s) => { const n = new Set(s); if (on) n.add(ref); else n.delete(ref); return n; });
    await arb("/validate", { method: "POST", body: JSON.stringify({ book, ref, on }) }).catch(() => {});
  };
  // Plage de la bande où le glissement a le droit de puiser. Par DÉFAUT = le chapitre
  // courant seul (on s'arrête à sa frontière). On l'étend vers un voisin seulement si
  // le bon français y est (décalage inter-chapitres). Bornes en indices de bande.
  const [range, setRange] = useState<{ lo: number; hi: number }>({ lo: 0, hi: 0 });
  const chBounds = useMemo(() => {
    if (!data) return { lo: 0, hi: 0 };
    const idx = data.band.map((b, i) => (b.ch === data.ch ? i : -1)).filter((i) => i >= 0);
    return { lo: idx[0] ?? 0, hi: idx[idx.length - 1] ?? (data.band.length - 1) };
  }, [data]);
  const hasCh = (c: number) => !!data?.band.some((b) => b.ch === c);
  const extend = (dir: -1 | 1) => {
    if (!data) return;
    const c = data.ch + dir;
    const idx = data.band.map((b, i) => (b.ch === c ? i : -1)).filter((i) => i >= 0);
    if (!idx.length) return;
    setRange((r) => (dir === 1 ? { ...r, hi: idx[idx.length - 1] } : { ...r, lo: idx[0] }));
  };

  const bandIndexOf = useMemo(() => {
    const m = new Map<string, number>();
    data?.band.forEach((b, i) => m.set(`${b.ch}:${b.v}`, i));
    return m;
  }, [data]);

  const load = useCallback(async () => {
    const d = await arb<RealignData & { error?: string }>(`/realign?book=${book}&ch=${ch}`);
    if ((d as { error?: string }).error) { setErr([(d as { error?: string }).error!]); return; }
    setData(d);
    const m = new Map<string, number>(); d.band.forEach((b, i) => m.set(`${b.ch}:${b.v}`, i));
    const a: Assign[] = d.grec.map((g) => {
      if (g.maison) return { kind: "maison", text: g.maison };
      if (g.source.length === 0) return { kind: "orphan" };
      if (g.source.length === 1 && g.source[0].length === 4) { const s = g.source[0]; return { kind: "extract", ch: s[0], v: s[1], from: s[2], to: s[3] }; }
      if (g.giguet && m.has(`${g.giguet.ch}:${g.giguet.v}`)) return { kind: "band", index: m.get(`${g.giguet.ch}:${g.giguet.v}`)! };
      return { kind: "keep" };
    });
    setAssign(a); setOrig(a.map((x) => ({ ...x })));
    setValid(new Set(d.grec.filter((g) => g.validated).map((g) => g.ref)));
    const idx = d.band.map((b, i) => (b.ch === ch ? i : -1)).filter((i) => i >= 0);
    setRange({ lo: idx[0] ?? 0, hi: idx[idx.length - 1] ?? d.band.length - 1 });
  }, [book, ch]);
  useEffect(() => { load(); }, [load]);

  if (!data)
    return (
      <div className="fixed inset-0 z-[80] flex justify-end">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="relative h-full w-full max-w-4xl overflow-y-auto bg-base-100 p-5">
          <button className="btn btn-sm btn-ghost" onClick={onClose}>Fermer</button>
          {err && <div className="alert alert-error mt-3 text-sm">{err.join(" ")}</div>}
        </div>
      </div>
    );

  const band = data.band;
  // Glisse d'un cran (delta) à partir du verset `from` (inclus). Ne touche que les
  // affectations "band" (les maison/orphelin/keep restent) ; borne à la bande.
  const slide = (from: number, delta: number) => {
    setAssign((prev) => prev.map((a, i) => {
      if (i < from || a.kind !== "band") return a;
      const ni = Math.min(range.hi, Math.max(range.lo, a.index + delta)); // borné à la plage (chapitre courant, sauf extension)
      return { kind: "band", index: ni };
    }));
  };
  const setRow = (i: number, a: Assign) => setAssign((prev) => prev.map((x, j) => (j === i ? a : x)));

  const wordsOf = (gc: number, gv: number): string[] => { const idx = bandIndexOf.get(`${gc}:${gv}`); return idx == null ? [] : band[idx].text.split(/\s+/).filter(Boolean); };
  const assignedV = (i: number): { ch: number; v: number } | null => { const a = assign[i]; if (a.kind === "band") return { ch: band[a.index].ch, v: band[a.index].v }; if (a.kind === "extract") return { ch: a.ch, v: a.v }; return null; };
  const frenchOf = (i: number): { text: string; tag: string } => {
    const a = assign[i];
    if (a.kind === "band") return { text: band[a.index].text, tag: `Giguet ${band[a.index].ch}:${band[a.index].v}` };
    if (a.kind === "extract") { const w = wordsOf(a.ch, a.v); return { text: w.slice(a.from, a.to + 1).join(" "), tag: `Giguet ${a.ch}:${a.v} · mots ${a.from + 1}-${a.to + 1}` }; }
    if (a.kind === "maison") return { text: a.text, tag: "maison" };
    if (a.kind === "orphan") return { text: "(grec seul, aucun français)", tag: "orphelin" };
    return { text: data.grec[i].french ?? "(inchangé)", tag: "extrait/multi (gardé)" };
  };
  const changed = (i: number) => {
    const a = assign[i], o = orig[i];
    if (a.kind !== o.kind) return true;
    if (a.kind === "band" && o.kind === "band") return a.index !== o.index;
    if (a.kind === "extract" && o.kind === "extract") return a.ch !== o.ch || a.v !== o.v || a.from !== o.from || a.to !== o.to;
    if (a.kind === "maison" && o.kind === "maison") return a.text !== o.text;
    return false;
  };
  const dirty = assign.map((_, i) => changed(i)).filter(Boolean).length;

  const save = async () => {
    setBusy(true); setErr(null);
    const changes = data.grec.map((g, i) => ({ g, i })).filter(({ i }) => changed(i)).map(({ g, i }) => {
      const a = assign[i];
      if (a.kind === "band") return { ref: g.ref, sources: [[band[a.index].ch, band[a.index].v]] };
      if (a.kind === "extract") return { ref: g.ref, sources: [[a.ch, a.v, a.from, a.to]] };
      if (a.kind === "orphan") return { ref: g.ref, sources: [] };
      if (a.kind === "maison") return { ref: g.ref, sources: [], maison: a.text };
      return null;
    }).filter(Boolean);
    const d = await arb<{ ok: boolean; errors?: string[] }>("/resolve-batch", { method: "POST", body: JSON.stringify({ book, changes }) });
    setBusy(false);
    if (d.ok) { await load(); } else setErr(d.errors || ["Échec de l'enregistrement."]);
  };

  return (
    <div className="fixed inset-0 z-[80] flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative h-full w-full max-w-4xl overflow-y-auto bg-base-100 p-5 shadow-2xl">
        <div className="sticky -top-5 z-10 -mx-5 -mt-5 flex flex-wrap items-center gap-2 border-b border-base-200 bg-base-100 px-5 py-3">
          <h2 className="text-lg font-bold">{BOOK[book] ?? book} {ch}</h2>
          <span className="text-xs text-base-content/60">Grec fixe à gauche ; le français se recale à droite.</span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {range.lo > chBounds.lo || range.hi < chBounds.hi ? null : (
              <div className="join">
                {hasCh(ch - 1) && <button className="btn btn-xs join-item" title="Le bon français vient du chapitre précédent" onClick={() => extend(-1)}>← inclure ch. {ch - 1}</button>}
                {hasCh(ch + 1) && <button className="btn btn-xs join-item" title="Le bon français vient du chapitre suivant" onClick={() => extend(1)}>inclure ch. {ch + 1} →</button>}
              </div>
            )}
            {(range.lo < chBounds.lo || range.hi > chBounds.hi) && <span className="badge badge-info badge-sm" title="La bande déborde sur un chapitre voisin">bande étendue</span>}
            <div className="join">
              <button className="btn btn-sm join-item" title="Tout le français monte d'un cran (borné à la bande)" onClick={() => slide(0, -1)}>↑ décaler tout</button>
              <button className="btn btn-sm join-item" title="Tout le français descend d'un cran (borné à la bande)" onClick={() => slide(0, 1)}>↓</button>
            </div>
            <button className="btn btn-sm btn-primary" disabled={busy || !dirty} onClick={save}>Enregistrer{dirty ? ` (${dirty})` : ""}</button>
            <button className="btn btn-sm btn-ghost" onClick={onClose}>Fermer</button>
          </div>
        </div>

        {err && <div className="alert alert-error mt-3 flex-col items-start gap-0.5 text-xs">{err.map((e, i) => <div key={i}>{e}</div>)}</div>}

        <div className="mt-3 grid gap-1.5">
          {data.grec.map((g, i) => {
            const fr = frenchOf(i);
            const isDirty = changed(i);
            return (
              <div key={g.ref} className={`grid grid-cols-2 gap-3 rounded-box border p-2.5 ${isDirty ? "border-primary bg-primary/5" : valid.has(g.ref) ? "border-success/40 bg-success/5" : g.flagged ? "border-warning/50" : "border-base-200"}`}
                onMouseEnter={() => setFocus(i)}>
                {/* Colonne GAUCHE : grec (fixe, autorité) */}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-base-content/50">v.{g.v}</span>
                    {valid.has(g.ref) && <span className="badge badge-success badge-xs" title="Vérifié à la main, c'est bon">vérifié</span>}
                    {g.flagged && !valid.has(g.ref) && <span className="badge badge-warning badge-xs" title="Signalé par les lecteurs, à vérifier">à vérifier</span>}
                    {g.overridden && <span className="badge badge-primary badge-xs">{g.by === "Βιβλίον" ? "toi" : g.by || "réglé"}</span>}
                  </div>
                  <p className="font-greek mt-0.5 leading-snug">{g.greek}</p>
                </div>
                {/* Colonne DROITE : français (glissable) */}
                <div className="min-w-0 border-l border-base-200 pl-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[0.7rem] uppercase tracking-wide text-base-content/45">{fr.tag}{fr.tag === "maison" && g.by ? ` · ${g.by === "Βιβλίον" ? "Biblion" : g.by}` : ""}</span>
                    {focus === i && (
                      <span className="join ml-auto">
                        <button className="btn btn-ghost btn-xs join-item" title="À partir d'ici, remonter le français d'un cran" onClick={() => slide(i, -1)}>↑ d'ici</button>
                        <button className="btn btn-ghost btn-xs join-item" title="À partir d'ici, descendre le français d'un cran" onClick={() => slide(i, 1)}>↓</button>
                      </span>
                    )}
                  </div>
                  {extractMode?.i === i && assignedV(i) ? (
                    // Sélecteur d'extrait : les mots du verset Giguet assigné, 1er clic = début, 2e = fin.
                    <div className="mt-0.5 rounded border-l-2 border-accent bg-accent/5 px-2 py-1.5">
                      <div className="flex items-center justify-between text-[0.7rem] uppercase tracking-wide text-accent">
                        <span>Extrait de {assignedV(i)!.ch}:{assignedV(i)!.v} : {extractMode.start == null ? "clique le 1er mot" : "clique le dernier mot"}</span>
                        <button className="btn btn-ghost btn-xs" onClick={() => setExtractMode(null)}>annuler</button>
                      </div>
                      <p className="mt-1 text-sm leading-loose">
                        {wordsOf(assignedV(i)!.ch, assignedV(i)!.v).map((w, wi) => (
                          <button key={wi} type="button"
                            className={`mr-1 rounded px-0.5 hover:bg-accent/25 ${extractMode.start != null && wi === extractMode.start ? "bg-accent text-accent-content" : ""}`}
                            onClick={() => {
                              const av = assignedV(i)!;
                              if (extractMode.start == null) setExtractMode({ i, start: wi });
                              else { const [from, to] = extractMode.start <= wi ? [extractMode.start, wi] : [wi, extractMode.start]; setRow(i, { kind: "extract", ch: av.ch, v: av.v, from, to }); setExtractMode(null); }
                            }}>{w}</button>
                        ))}
                      </p>
                    </div>
                  ) : (
                    <p className={`mt-0.5 text-sm leading-relaxed ${fr.tag === "orphelin" ? "italic text-base-content/40" : ""}`}>{fr.text}</p>
                  )}
                  {focus === i && extractMode?.i !== i && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {assignedV(i) && <button className="btn btn-ghost btn-xs text-accent" title="Ne lier qu'une partie du verset Giguet (Giguet fusionne parfois deux versets)" onClick={() => setExtractMode({ i, start: null })}>extrait de mots</button>}
                      <MaisonInline current={assign[i].kind === "maison" ? (assign[i] as { text: string }).text : g.french || ""} onSet={(t) => setRow(i, { kind: "maison", text: t })} />
                      <button className="btn btn-ghost btn-xs" onClick={() => setRow(i, { kind: "orphan" })}>orphelin</button>
                      <button className={`btn btn-xs ${valid.has(g.ref) ? "btn-success" : "btn-ghost text-success"}`} title="Vérifié, ne plus signaler comme erreur" onClick={() => toggleValid(g.ref)}>{valid.has(g.ref) ? "✓ vérifié" : "c'est bon"}</button>
                      {isDirty && <button className="btn btn-ghost btn-xs" onClick={() => setRow(i, { ...orig[i] })}>annuler</button>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── Logs (activité partagée) ─────────────────────────
type LogEntry = { by: string; at: string; kind: "lien" | "maison" | "validation" | "orphelin"; book: string; ref: string; detail?: string };
const KIND_LABEL: Record<string, string> = { lien: "lien", maison: "maison", validation: "vérifié", orphelin: "orphelin" };
const KIND_CLASS: Record<string, string> = { lien: "badge-primary", maison: "badge-secondary", validation: "badge-success", orphelin: "badge-ghost" };
const who = (by: string) => (by === "Βιβλίον" ? "Biblion" : by);
const when = (iso: string) => { const d = new Date(iso); return isNaN(d.getTime()) ? iso : d.toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); };

export function LogsSection() {
  const [entries, setEntries] = useState<LogEntry[] | null>(null);
  useEffect(() => { arb<{ entries: LogEntry[] }>("/logs").then((d) => setEntries(d.entries || [])).catch(() => setEntries([])); }, []);
  if (!entries) return <p className="mt-6 text-sm text-base-content/60">Chargement…</p>;
  if (!entries.length) return <p className="mt-6 text-sm text-base-content/60">Aucune activité pour l'instant.</p>;
  return (
    <div className="mt-4">
      <p className="text-sm text-base-content/70">Ce que Biblion et les admins ont fait, du plus récent au plus ancien.</p>
      <div className="mt-3 grid gap-1">
        {entries.map((e, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2 rounded-box border border-base-200 bg-base-100 px-3 py-2 text-sm">
            <span className={`badge badge-xs ${KIND_CLASS[e.kind] || "badge-ghost"}`}>{KIND_LABEL[e.kind] || e.kind}</span>
            <span className="font-medium">{who(e.by)}</span>
            <span className="text-base-content/70">{BOOK[e.book] ?? e.book} {e.ref}</span>
            {e.detail && <span className="truncate text-xs text-base-content/50">{e.kind === "maison" ? `« ${e.detail}… »` : `← ${e.detail}`}</span>}
            <span className="ml-auto text-xs text-base-content/45">{when(e.at)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Traduction maison inline (texte libre servi tel quel).
function MaisonInline({ current, onSet }: { current: string; onSet: (t: string) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(current);
  if (!open) return <button className="btn btn-ghost btn-xs text-secondary" onClick={() => { setText(current); setOpen(true); }}>traduire moi-même</button>;
  return (
    <span className="flex w-full items-start gap-1">
      <textarea className="textarea textarea-bordered textarea-xs w-full" rows={2} value={text} onChange={(e) => setText(e.target.value)} autoFocus />
      <button className="btn btn-primary btn-xs" disabled={!text.trim()} onClick={() => { onSet(text.trim()); setOpen(false); }}>ok</button>
      <button className="btn btn-ghost btn-xs" onClick={() => setOpen(false)}>✕</button>
    </span>
  );
}
