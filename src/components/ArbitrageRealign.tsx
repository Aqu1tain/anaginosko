"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { arb, BOOK } from "./ArbitrageBiblion";

// Refonte : carte des erreurs (où corriger) + réalignement DEUX COLONNES d'un chapitre.
// Le grec est fixe (gauche) ; le français Giguet est une bande glissable (droite) qui
// déborde sur les chapitres voisins. On fait glisser d'un cran pour tout recaler ; seul
// le chapitre affiché est enregistré. Les divergences de lecteurs = simple drapeau.

type Src = [number, number] | [number, number, number, number];
type Grec = { v: number; greek: string; ref: string; source: Src[]; giguet: { ch: number; v: number } | null; french: string | null; maison: string | null; by: string | null; overridden: boolean; flagged: boolean; validated: boolean };
type Band = { ch: number; v: number; text: string };
type RealignData = { book: string; ch: number; grec: Grec[]; band: Band[]; chapterFirstIndex: number; errorRefs: string[] };
type Overview = { books: { book: string; label: string; total: number; chapters: { ch: number; count: number }[] }[]; grandTotal: number };

// Affectation de travail d'un verset grec : indice dans la bande, orphelin, maison, ou
// "garder" (source complexe d'origine : extrait/multi, qu'on ne touche pas au glissement).
// "extract" : une PLAGE DE MOTS d'un verset Giguet (Giguet fusionne parfois deux
// versets grecs en un ; chaque grec prend alors sa part). ch/v = le verset Giguet,
// from/to = indices de mots 0-based inclusifs.
// "pick" : un verset Giguet ENTIER choisi n'importe où dans le livre (cherry-pick),
// même hors de la bande courante. On garde son texte pour l'aperçu.
type Assign = { kind: "band"; index: number } | { kind: "pick"; ch: number; v: number; text: string } | { kind: "extract"; ch: number; v: number; from: number; to: number } | { kind: "orphan" } | { kind: "maison"; text: string } | { kind: "keep" };

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
  const [extractMode, setExtractMode] = useState<{ i: number; start: number | null } | null>(null); // sélection d'une plage de mots
  const [pickMode, setPickMode] = useState<number | null>(null); // cherry-pick : quel verset choisit un Giguet
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
  // Glissement : décale UNIFORMÉMENT l'indice de bande (pas de blocage). Un verset qui
  // tombe hors de la plage courante s'affiche orphelin (visible), mais garde son indice
  // pour qu'on puisse le ramener en glissant dans l'autre sens. C'est ce qu'on voit bouger.
  const inRange = (idx: number) => idx >= range.lo && idx <= range.hi && idx >= 0 && idx < band.length;
  const slide = (from: number, delta: number) => {
    setAssign((prev) => prev.map((a, i) => {
      if (i < from) return a;
      if (a.kind === "band") return { kind: "band", index: a.index + delta };
      if (a.kind === "extract") { const idx = bandIndexOf.get(`${a.ch}:${a.v}`); if (idx != null) return { kind: "band", index: idx + delta }; }
      return a; // maison / orphelin / keep : le glissement ne les emporte pas
    }));
  };
  const setRow = (i: number, a: Assign) => setAssign((prev) => prev.map((x, j) => (j === i ? a : x)));

  // Vide = pas de français à ce verset (orphelin, ou band hors plage).
  const isEmptyAt = (arr: Assign[], k: number) => { if (k < 0 || k >= arr.length) return true; const a = arr[k]; return a.kind === "orphan" || (a.kind === "band" && !inRange(a.index)); };
  // Déplace le BLOC collé (versets contigus avec un français) contenant `i`, d'un cran
  // vers le haut (dir -1) ou le bas (dir +1), dans le vide adjacent. S'arrête aux vides :
  // le bloc glisse dans la case vide voisine, l'autre bout devient vide. Touche bien le
  // verset cliqué (il fait partie du bloc).
  const moveBlock = (i: number, dir: -1 | 1) => setAssign((prev) => {
    if (isEmptyAt(prev, i)) return prev;
    let b = i, j = i;
    while (!isEmptyAt(prev, b - 1)) b--;
    while (!isEmptyAt(prev, j + 1)) j++;
    const a = [...prev];
    if (dir === -1) {
      if (b === 0) return prev; // bloc en haut, rien au-dessus
      for (let k = b - 1; k < j; k++) a[k] = prev[k + 1];
      a[j] = { kind: "orphan" };
    } else {
      if (j === prev.length - 1) return prev; // bloc en bas
      for (let k = j + 1; k > b; k--) a[k] = prev[k - 1];
      a[b] = { kind: "orphan" };
    }
    return a;
  });
  // Le bloc peut-il monter / descendre ? (y a-t-il un vide adjacent).
  const canUp = (i: number) => { if (isEmptyAt(assign, i)) return false; let b = i; while (!isEmptyAt(assign, b - 1)) b--; return b > 0; };
  const canDown = (i: number) => { if (isEmptyAt(assign, i)) return false; let j = i; while (!isEmptyAt(assign, j + 1)) j++; return j < assign.length - 1; };

  const wordsOf = (gc: number, gv: number): string[] => { const idx = bandIndexOf.get(`${gc}:${gv}`); return idx == null ? [] : band[idx].text.split(/\s+/).filter(Boolean); };
  const assignedV = (i: number): { ch: number; v: number } | null => { const a = assign[i]; if (a.kind === "band") return inRange(a.index) ? { ch: band[a.index].ch, v: band[a.index].v } : null; if (a.kind === "pick") return { ch: a.ch, v: a.v }; if (a.kind === "extract") return { ch: a.ch, v: a.v }; return null; };
  const ORPHAN = { text: "", tag: "sans traduction" };
  const frenchOf = (i: number): { text: string; tag: string } => {
    const a = assign[i];
    if (a.kind === "band") return inRange(a.index) ? { text: band[a.index].text, tag: `Giguet ${band[a.index].ch}:${band[a.index].v}` } : ORPHAN;
    if (a.kind === "pick") return { text: a.text, tag: `Giguet ${a.ch}:${a.v}` };
    if (a.kind === "extract") { const words = wordsOf(a.ch, a.v); return { text: words.slice(a.from, a.to + 1).join(" "), tag: `Giguet ${a.ch}:${a.v} · mots ${a.from + 1}-${a.to + 1}` }; }
    if (a.kind === "maison") return { text: a.text, tag: "maison" };
    if (a.kind === "orphan") return ORPHAN;
    return { text: data.grec[i].french ?? "", tag: "extrait/multi (gardé)" };
  };
  const changed = (i: number) => {
    const a = assign[i], o = orig[i];
    if (a.kind !== o.kind) return true;
    if (a.kind === "band" && o.kind === "band") return a.index !== o.index;
    if (a.kind === "pick" && o.kind === "pick") return a.ch !== o.ch || a.v !== o.v;
    if (a.kind === "extract" && o.kind === "extract") return a.ch !== o.ch || a.v !== o.v || a.from !== o.from || a.to !== o.to;
    if (a.kind === "maison" && o.kind === "maison") return a.text !== o.text;
    return false;
  };
  const dirty = assign.map((_, i) => changed(i)).filter(Boolean).length;

  const save = async () => {
    setBusy(true); setErr(null);
    const changes = data.grec.map((g, i) => ({ g, i })).filter(({ i }) => changed(i)).map(({ g, i }) => {
      const a = assign[i];
      if (a.kind === "band") return { ref: g.ref, sources: inRange(a.index) ? [[band[a.index].ch, band[a.index].v]] : [] };
      if (a.kind === "pick") return { ref: g.ref, sources: [[a.ch, a.v]] };
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
              <button className="btn btn-sm join-item" title="Toute la traduction descend d'un cran (le premier verset reste sans traduction)" onClick={() => slide(0, -1)}>traduction ↓</button>
              <button className="btn btn-sm join-item" title="Toute la traduction monte d'un cran" onClick={() => slide(0, 1)}>↑</button>
            </div>
            {(() => { const remaining = data.errorRefs.filter((r) => !valid.has(r)); return remaining.length > 0 ? (
              <button className="btn btn-sm btn-success btn-outline" title="Marquer tout ce chapitre comme vérifié : il ne remontera plus comme erreur" disabled={busy}
                onClick={async () => { setValid((s) => { const n = new Set(s); remaining.forEach((r) => n.add(r)); return n; }); await arb("/validate", { method: "POST", body: JSON.stringify({ book, refs: remaining, on: true }) }).catch(() => {}); }}>
                ✓ tout ce chapitre est bon ({remaining.length})
              </button>
            ) : <span className="badge badge-success badge-sm">chapitre vérifié</span>; })()}
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
              <div key={g.ref} className={`grid grid-cols-2 gap-3 rounded-box border p-2.5 ${isDirty ? "border-primary bg-primary/5" : valid.has(g.ref) ? "border-success/40 bg-success/5" : g.flagged ? "border-warning/50" : "border-base-200"}`}>
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
                {/* Colonne DROITE : français. Flèches de BLOC toujours visibles (le bloc collé
                    monte/descend dans le vide voisin ; désactivées s'il n'y a pas de place). */}
                <div className="min-w-0 border-l border-base-200 pl-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[0.7rem] uppercase tracking-wide text-base-content/45">{fr.tag}{fr.tag === "maison" && g.by ? ` · ${g.by === "Βιβλίον" ? "Biblion" : g.by}` : ""}</span>
                    <span className="join ml-auto">
                      <button className="btn btn-ghost btn-xs join-item" title="Monter ce bloc de traduction d'un cran" disabled={!canUp(i)} onClick={() => moveBlock(i, -1)}>↑</button>
                      <button className="btn btn-ghost btn-xs join-item" title="Descendre ce bloc de traduction d'un cran" disabled={!canDown(i)} onClick={() => moveBlock(i, 1)}>↓</button>
                    </span>
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
                  ) : pickMode === i ? (
                    <CherryPick book={book} current={assignedV(i)} defaultCh={ch} onPick={(pch, pv, ptext) => { setRow(i, { kind: "pick", ch: pch, v: pv, text: ptext }); setPickMode(null); }} onCancel={() => setPickMode(null)} />
                  ) : (
                    <p className={`mt-0.5 text-sm leading-relaxed ${!fr.text ? "italic text-base-content/35" : ""}`}>{fr.text || "— sans traduction française"}</p>
                  )}
                  {extractMode?.i !== i && pickMode !== i && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      <button className="btn btn-ghost btn-xs" title="Choisir n'importe quel verset Giguet du livre (cherry-pick)" onClick={() => setPickMode(i)}>choisir…</button>
                      {assignedV(i) && <button className="btn btn-ghost btn-xs text-accent" title="Ne lier qu'une partie du verset Giguet (Giguet fusionne parfois deux versets)" onClick={() => setExtractMode({ i, start: null })}>extrait</button>}
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

export function LogsSection({ onOpen }: { onOpen?: (book: string, ch: number) => void }) {
  const [entries, setEntries] = useState<LogEntry[] | null>(null);
  useEffect(() => { arb<{ entries: LogEntry[] }>("/logs").then((d) => setEntries(d.entries || [])).catch(() => setEntries([])); }, []);
  if (!entries) return <p className="mt-6 text-sm text-base-content/60">Chargement…</p>;
  if (!entries.length) return <p className="mt-6 text-sm text-base-content/60">Aucune activité pour l'instant.</p>;
  return (
    <div className="mt-4">
      <p className="text-sm text-base-content/70">Ce que Biblion et les admins ont fait, du plus récent au plus ancien. Clique une ligne pour ouvrir le chapitre.</p>
      <div className="mt-3 grid gap-1">
        {entries.map((e, i) => {
          const ch = Number(e.ref.split(":")[0]);
          return (
            <button key={i} type="button" disabled={!onOpen || !Number.isInteger(ch)}
              onClick={() => onOpen?.(e.book, ch)}
              className="flex flex-wrap items-center gap-2 rounded-box border border-base-200 bg-base-100 px-3 py-2 text-left text-sm enabled:hover:border-primary/40 enabled:cursor-pointer">
              <span className={`badge badge-xs ${KIND_CLASS[e.kind] || "badge-ghost"}`}>{KIND_LABEL[e.kind] || e.kind}</span>
              <span className="font-medium">{who(e.by)}</span>
              <span className="text-base-content/70">{BOOK[e.book] ?? e.book} {e.ref}</span>
              {e.detail && <span className="truncate text-xs text-base-content/50">{e.kind === "maison" ? `« ${e.detail}… »` : `← ${e.detail}`}</span>}
              <span className="ml-auto text-xs text-base-content/45">{when(e.at)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Cherry-pick : choisir N'IMPORTE QUEL verset Giguet du livre. À l'ouverture, on PARCOURT
// le chapitre du choix actuel, centré et surligné sur lui, avec navigation chapitre par
// chapitre — pour retrouver le bon verset sans connaître le texte par cœur. Taper ≥ 2
// lettres bascule en recherche plein texte dans tout le livre.
type Pick = { ch: number; v: number; text: string; linkedTo?: string | null; partial?: boolean };
function CherryPick({ book, current, defaultCh, onPick, onCancel }: { book: string; current: { ch: number; v: number } | null; defaultCh: number; onPick: (ch: number, v: number, text: string) => void; onCancel: () => void }) {
  const [q, setQ] = useState("");
  const [browseCh, setBrowseCh] = useState(current?.ch ?? defaultCh);
  const [browse, setBrowse] = useState<Pick[]>([]);
  const [found, setFound] = useState<Pick[]>([]);
  const searching = q.trim().length >= 2;
  const boxRef = useRef<HTMLDivElement>(null);
  const curRef = useRef<HTMLButtonElement>(null);

  // Parcours du chapitre courant (liste complète des versets Giguet, contexte compris).
  useEffect(() => {
    let live = true;
    arb<{ results: Pick[] }>(`/search?book=${book}&ch=${browseCh}`).then((d) => { if (live) setBrowse(d.results || []); }).catch(() => {});
    return () => { live = false; };
  }, [book, browseCh]);

  // Recherche plein texte (tout le livre).
  useEffect(() => {
    if (!searching) { setFound([]); return; }
    const t = setTimeout(async () => { const d = await arb<{ results: Pick[] }>(`/search?book=${book}&q=${encodeURIComponent(q)}`); setFound(d.results || []); }, 250);
    return () => clearTimeout(t);
  }, [q, book, searching]);

  // Centre la liste sur le verset actuel à l'ouverture (scroll interne seulement).
  useEffect(() => {
    if (searching) return;
    const c = boxRef.current, el = curRef.current;
    if (c && el) c.scrollTop = el.offsetTop - c.clientHeight / 2 + el.clientHeight / 2;
  }, [browse, searching]);

  const list = searching ? found : browse;
  return (
    <div className="mt-0.5 rounded border-l-2 border-primary bg-primary/5 px-2 py-1.5">
      <div className="flex items-center gap-1.5">
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher dans tout le livre…" className="input input-bordered input-xs min-w-0 flex-1" spellCheck={false} autoComplete="off" />
        <button className="btn btn-ghost btn-xs" onClick={onCancel}>annuler</button>
      </div>
      {!searching && (
        <div className="mt-1 flex items-center justify-between text-[0.7rem] uppercase tracking-wide text-base-content/50">
          <button className="btn btn-ghost btn-xs" disabled={browseCh <= 1} onClick={() => setBrowseCh((c) => Math.max(1, c - 1))}>← ch. {browseCh - 1}</button>
          <span>Giguet · chapitre {browseCh}</span>
          <button className="btn btn-ghost btn-xs" onClick={() => setBrowseCh((c) => c + 1)}>ch. {browseCh + 1} →</button>
        </div>
      )}
      <div ref={boxRef} className="relative mt-1 max-h-64 overflow-y-auto">
        {list.map((r) => {
          const isCur = !searching && current != null && r.ch === current.ch && r.v === current.v;
          return (
            <button key={`${r.ch}:${r.v}`} ref={isCur ? curRef : undefined} type="button"
              className={`block w-full rounded px-1.5 py-1 text-left text-sm hover:bg-primary/10 ${isCur ? "bg-primary/15 ring-1 ring-primary/40" : ""}`}
              onClick={() => onPick(r.ch, r.v, r.text)}>
              <span className="verse-num">{r.ch}:{r.v}</span>
              {isCur && <span className="badge badge-primary badge-xs mr-1 align-middle">actuel</span>}
              {r.linkedTo && <span className="badge badge-ghost badge-xs mr-1 align-middle" title={`Déjà lié au grec ${r.linkedTo}`}>lié {r.linkedTo}{r.partial ? " (part.)" : ""}</span>}
              {r.text.slice(0, 90)}{r.text.length > 90 ? "…" : ""}
            </button>
          );
        })}
        {searching && found.length === 0 && <p className="px-1.5 py-1 text-xs text-base-content/50">Aucun résultat.</p>}
        {!searching && browse.length === 0 && <p className="px-1.5 py-1 text-xs text-base-content/50">Chapitre vide.</p>}
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
