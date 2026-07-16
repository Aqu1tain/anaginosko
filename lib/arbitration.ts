import "server-only";
import fs from "node:fs";
import path from "node:path";
import { materializeSources, materializeEntry, giguetWords as giguetWordsOf } from "./lxx-materialize.mjs";

// Cœur serveur de l'arbitrage. Modèle de LIENS : un verset grec (Rahlfs, autorité)
// -> suite ordonnée de versets Giguet source (0 = orphelin, 1 = paire, 2+ = scission ;
// plusieurs grecs -> un français = fusion). On ne modifie JAMAIS le texte Giguet.
// Override (Biblion) > auto ; garanties d'intégrité sur chaque écriture.

// Source d'un lien : un verset Giguet ENTIER [ch, v], ou un EXTRAIT [ch, v, de, à]
// (plage de mots, indices 0-based inclusifs, découpage par espaces). On pointe une
// plage du texte immuable ; on ne coupe jamais le texte lui-même. Cas type : la
// versification de Giguet fusionne deux versets grecs en un (jdt 16:8 = la moitié
// de Giguet 16:10) ; chaque verset grec lie alors son extrait.
export type Source = [number, number] | [number, number, number, number];
// `maison` : traduction propre en texte LIBRE (suscription de psaume que Giguet omet,
// verset grec-seul traduit maison KAN-67). Servie telle quelle ; sources alors = [].
export type Override = { sources: Source[]; by: string; at: string; note?: string; maison?: string; provenance?: string };
export type ChapterState = { scaled: boolean; state: "auto-resolved" | "not-converged" | "pending-scale"; pending: number };
export type QueueItem = {
  book: string; ref: string; kind: string; grain: string; priority: number; reason?: string;
  greek?: string; canon?: string; proposals?: { reader: string; sources: [string, string][]; orphan?: [string, string][] }[];
};

// Données statiques (Giguet immuable, liens, file, états) : bundlées avec l'app
// (lecture seule). Overrides de Biblion : ARB_DIR, emplacement INSCRIPTIBLE et
// PERSISTANT (sur préprod, hors du bundle réécrit à chaque déploiement).
const DATA_DIR = process.env.ARB_STATIC_DIR || path.join(process.cwd(), "data");
const ARB_DIR = process.env.ARB_DIR || DATA_DIR;
const readJson = (name: string, fallback: unknown = null, dir = DATA_DIR) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, name), "utf8"));
  } catch {
    return fallback;
  }
};

type Giguet = Record<string, Record<string, Record<string, string>>>; // book -> ch -> v -> text
type Links = Record<string, Record<string, Source[] | null>>; // book -> "gCh:gV" -> sources|null
type Overrides = Record<string, Record<string, Override>>; // book -> ref -> override
type States = Record<string, Record<string, ChapterState>>; // book -> ch -> state

let _giguet: Giguet | null = null;
export const giguet = (): Giguet => (_giguet ??= readJson("giguet-lxx.json", {}));
export const links = (): Links => readJson("lxx-links.json", {});
export const queue = (): QueueItem[] => readJson("lxx-queue.json", []);
export const states = (): States => readJson("lxx-chapter-state.json", {});
export const overrides = (): Overrides => readJson("lxx-arbitration.json", {}, ARB_DIR);

// File de revue Phase 2 (292 cas à trancher) + traductions maison des suscriptions
// (28, KAN-67), données statiques du bundle. Décisions « classées » (titre/marqueur
// sans override grec) : persistées dans ARB_DIR à côté de l'arbitrage.
export type BiblionCase = {
  book: string; cause: string; grec?: string; giguet?: string; sources?: Source[];
  preuve?: string; a?: Proposition; b?: Proposition;
};
export type Proposition = {
  grec?: string; giguet?: string; disposition: string; sources?: Source[];
  rattacheGrec?: string | null; sourcesEtendues?: Source[]; preuve?: string; confiance?: string;
};
export type Psalm = { ref: string; grec: string; accord: boolean; maison_A: string; maison_B: string; choix: string | null; decomposition: string; confiance: string[] };
// Verset VALIDÉ à la main : Biblion (ou un admin) l'a vérifié et déclaré bon. Il ne
// remonte plus comme erreur, même s'il était signalé par les lecteurs. Persisté ARB_DIR.
export type Validation = { book: string; ref: string; by: string; at: string };

export type CoverageGaps = {
  greekSansEtat?: Record<string, { ref: string; grec: string }[]>;
  trous?: Record<string, { ref: string; text: string }[]>;
  aTraduireProuve?: Record<string, { ref: string; grec: string; cause?: string }[]>;
};
export const coverageGaps = (): CoverageGaps => readJson("lxx-coverage-gaps.json", {});
export const biblionQueue = (): BiblionCase[] => readJson("lxx-biblion-queue.json", []);
export const psalmsKan67 = (): { suscriptions: Psalm[] } => readJson("lxx-psaumes-kan67.json", { suscriptions: [] });
const VALID_PATH = path.join(ARB_DIR, "lxx-biblion-validated.json");
export const validations = (): Validation[] => readJson("lxx-biblion-validated.json", [], ARB_DIR);
export const validatedSet = (): Set<string> => new Set(validations().map((v) => `${v.book}:${v.ref}`));
export function setValidated(book: string, ref: string, on: boolean, by: string) {
  setValidatedMany(book, [ref], on, by);
}
// Valide (ou dévalide) plusieurs versets d'un coup : « tout ce chapitre est bon »
// couvre toutes les erreurs du chapitre (grec sans français ET trous côté Giguet).
export function setValidatedMany(book: string, refs: string[], on: boolean, by: string) {
  const drop = new Set(refs.map((r) => `${book}:${r}`));
  const all = validations().filter((v) => !drop.has(`${v.book}:${v.ref}`));
  if (on) { const at = new Date().toISOString(); for (const ref of refs) all.push({ book, ref, by, at }); }
  const tmp = VALID_PATH + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(all, null, 2));
  fs.renameSync(tmp, VALID_PATH);
}

// Journal d'activité : qui a fait quoi, quand. Agrège les overrides datés (liens et
// traductions maison, par Biblion ou un admin) et les validations manuelles, triés du
// plus récent au plus ancien. Sert l'onglet Logs (Biblion et les admins voient l'activité
// de l'autre). On n'inclut que les actions HUMAINES (champ `at`), pas la campagne machine.
export type LogEntry = { by: string; at: string; kind: "lien" | "maison" | "validation" | "orphelin"; book: string; ref: string; detail?: string };
export function activityLog(limit = 200): LogEntry[] {
  const out: LogEntry[] = [];
  const arb = overrides();
  for (const book of Object.keys(arb)) {
    if (book.startsWith("_")) continue;
    for (const ref of Object.keys(arb[book])) {
      const e = arb[book][ref];
      if (!e.at) continue; // entrées de campagne (sans horodatage) exclues
      const kind = e.maison ? "maison" : e.sources.length === 0 ? "orphelin" : "lien";
      out.push({ by: e.by, at: e.at, kind, book, ref, detail: e.maison ? e.maison.slice(0, 60) : e.sources.map((s) => (s.length === 4 ? `${s[0]}:${s[1]}·${s[2] + 1}-${s[3] + 1}` : `${s[0]}:${s[1]}`)).join(" + ") });
    }
  }
  for (const v of validations()) out.push({ by: v.by, at: v.at, kind: "validation", book: v.book, ref: v.ref });
  out.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  return out.slice(0, limit);
}

// Entrées archivées (retraites justifiées, ex. les 11 overrides Job) : lues depuis
// la section _archived de l'arbitrage, aplaties en liste pour l'affichage.
export function archivedEntries(): { book: string; ref: string; sources: Source[]; reason: string; at: string | null }[] {
  const arb = overrides() as Overrides & { _archived?: Record<string, unknown> };
  const arch = (arb._archived || {}) as Record<string, unknown>;
  const reason = (arch._reason as string) || "";
  const at = (arch.archivedAt as string) || null;
  const out: { book: string; ref: string; sources: Source[]; reason: string; at: string | null }[] = [];
  for (const book of Object.keys(arch)) {
    if (book.startsWith("_") || book === "archivedAt") continue;
    const refs = arch[book] as Record<string, { sources: Source[] }>;
    for (const ref of Object.keys(refs)) out.push({ book, ref, sources: refs[ref].sources, reason, at });
  }
  return out;
}

// Diff « depuis la dernière visite » : overrides actifs dont `at` > since (installés
// ou frais de Biblion), et entrées archivées après `since`. Le timestamp de visite
// est gardé côté client (localStorage), passé ici en paramètre.
export function sinceLastVisit(since: string): { installed: { book: string; ref: string; by: string; at: string; maison?: string }[]; archived: { book: string; ref: string }[] } {
  const cutoff = since ? Date.parse(since) : 0;
  const installed: { book: string; ref: string; by: string; at: string; maison?: string }[] = [];
  const arb = overrides();
  for (const book of Object.keys(arb)) {
    if (book.startsWith("_")) continue;
    for (const ref of Object.keys(arb[book])) {
      const e = arb[book][ref];
      if (e.at && Date.parse(e.at) > cutoff) installed.push({ book, ref, by: e.by, at: e.at, maison: e.maison });
    }
  }
  const archived: { book: string; ref: string }[] = [];
  const archAt = archivedEntries()[0]?.at;
  if (archAt && Date.parse(archAt) > cutoff) for (const a of archivedEntries()) archived.push({ book: a.book, ref: a.ref });
  return { installed, archived };
}

const OV_PATH = path.join(ARB_DIR, "lxx-arbitration.json");

const LXX_DIR = process.env.LXX_DATA_DIR || path.join(process.cwd(), "public/lxx");

// Versets grecs d'un chapitre (colonne autoritaire, ordre fixe).
export function greekVerses(book: string, ch: number): { v: number; greek: string }[] | null {
  const p = path.join(LXX_DIR, book, `${ch}.json`);
  if (!fs.existsSync(p)) return null;
  const mots = JSON.parse(fs.readFileSync(p, "utf8")).mots || [];
  const byV = new Map<number, string[]>();
  for (const m of mots) {
    if (m.verse == null) continue;
    if (!byV.has(m.verse)) byV.set(m.verse, []);
    byV.get(m.verse)!.push(m.grec);
  }
  return [...byV.entries()].sort((a, b) => a[0] - b[0]).map(([v, w]) => ({ v, greek: w.join(" ") }));
}

// Recherche plein texte dans le Giguet immuable d'un livre (picker cherry-pick).
export function searchGiguet(book: string, q: string, limit = 40): { ch: number; v: number; text: string }[] {
  const g = giguet()[book] || {};
  const needle = q.normalize("NFC").toLowerCase().trim();
  const out: { ch: number; v: number; text: string }[] = [];
  for (const ch of Object.keys(g)) {
    for (const v of Object.keys(g[ch])) {
      if (!needle || g[ch][v].toLowerCase().includes(needle)) {
        out.push({ ch: Number(ch), v: Number(v), text: g[ch][v] });
        if (out.length >= limit) return out;
      }
    }
  }
  return out;
}

// Texte français EFFECTIF servi pour un verset grec : override maison (texte libre)
// > sources matérialisées > null (grec seul / orphelin). Une seule porte pour le
// runtime (applyToReader) et l'affichage (route chapter) : maison et Giguet passent ici.
export function servedText(book: string, ref: string): string | null {
  const ov = overrides()[book]?.[ref];
  if (ov?.maison && ov.maison.trim()) return ov.maison.trim();
  const src = effectiveSources(book, ref);
  return src && src.length ? materialize(book, src) : null;
}

// Applique le lien effectif d'un verset grec au fr.json servi (matérialisation
// chirurgicale : le lecteur reflète l'override immédiatement ; le build rejoue tout).
// BEST-EFFORT : la vérité durable est l'ARB_DIR (déjà écrit) + la matérialisation au
// déploiement. Si le fr.json servi n'est pas inscriptible (ex. arbre lxx encore possédé
// par le CI, pas par le service), on journalise et on rend true/false ; on ne fait JAMAIS
// échouer l'enregistrement de l'arbitrage pour un rafraîchissement de lecteur raté.
export function applyToReader(book: string, ref: string): boolean {
  const [ch, v] = ref.split(":");
  const frPath = path.join(LXX_DIR, book, "fr.json");
  try {
    const fr = JSON.parse(fs.readFileSync(frPath, "utf8"));
    fr[ch] = fr[ch] || {};
    const text = servedText(book, ref);
    if (text != null) fr[ch][v] = text;
    else delete fr[ch][v]; // orphelin-grec -> pas de français (grec seul)
    // Crédit maison : maintenu à côté du texte pour l'affichage lecteur.
    const ovEntry = overrides()[book]?.[ref];
    if (ovEntry?.maison && ovEntry.by) { fr._maison = fr._maison || {}; fr._maison[ref] = ovEntry.by; }
    else if (fr._maison) delete fr._maison[ref];
    const tmp = frPath + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(fr));
    fs.renameSync(tmp, frPath);
    return true;
  } catch (e) {
    console.error(`applyToReader ${book} ${ref} : rafraîchissement du lecteur impossible (arbitrage sauvegardé, servi au prochain déploiement) :`, (e as Error).message);
    return false;
  }
}

export const giguetText = (book: string, ch: number, v: number): string | null =>
  giguet()[book]?.[String(ch)]?.[String(v)] ?? null;

export const giguetExists = (book: string, s: Source): boolean => giguetText(book, s[0], s[1]) != null;

// Lien effectif : override (Biblion) l'emporte sur l'auto.
export function effectiveSources(book: string, ref: string): Source[] | null {
  const ov = overrides()[book]?.[ref];
  if (ov) return ov.sources;
  const a = links()[book]?.[ref];
  return a === undefined ? null : a;
}

// Découpage en mots du texte Giguet (déterministe : espaces). Les extraits
// [de, à] indexent ce découpage. Délègue au module par-ref partagé.
export const giguetWords = (book: string, ch: number, v: number): string[] | null =>
  giguetWordsOf(giguet()[book], ch, v);

// Texte matérialisé d'un lien : concaténation des sources (versets ou extraits),
// dans l'ordre. Source unique de vérité = lib/lxx-materialize.mjs.
export const materialize = (book: string, sources: Source[]): string =>
  materializeSources(giguet()[book], sources);

const vkey = (s: Source) => `${s[0]}:${s[1]}`;
const label = (s: Source) => (s.length === 4 ? `${s[0]}:${s[1]} (mots ${s[2] + 1}-${s[3] + 1})` : vkey(s));
// Intervalle de mots revendiqué : verset entier = [0, +inf).
const spanOf = (s: Source): [number, number] => (s.length === 4 ? [s[2], s[3]] : [0, Number.MAX_SAFE_INTEGER]);
const overlaps = (a: [number, number], b: [number, number]) => a[0] <= b[1] && b[0] <= a[1];

type Claims = Map<string, { ref: string; span: [number, number] }[]>;

// Intégrité, appliquée à CHAQUE écriture (auto ou Biblion). `claims` optionnel : carte
// des revendications à confronter pour le zéro-perte. Par défaut = état courant ; un lot
// passe la carte APRÈS application de tout le lot (voir checkBatch) pour ne pas voir de
// faux conflit pendant un simple décalage.
export function checkOverride(book: string, ref: string, sources: Source[], maison?: string, claims?: Claims): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  // Round-trip : la ref grec doit parser (grec = colonne fixe, jamais renumérotée).
  if (!/^\d+:\d+$/.test(ref)) errors.push(`Ref grec invalide : ${ref}`);
  // Entrée MAISON (texte libre) : ne pointe aucun mot Giguet, donc sources vide.
  // On ne vérifie ni existence ni zéro-perte (elle ne revendique rien).
  if (maison && maison.trim()) {
    if (sources.length) errors.push("Une traduction maison ne lie aucun verset Giguet : sources doit être vide.");
    return { ok: errors.length === 0, errors };
  }
  // 1) Sources existantes ; extraits dans les bornes du verset.
  for (const s of sources) {
    if (!giguetExists(book, s)) {
      errors.push(`Verset Giguet inexistant : ${vkey(s)}`);
      continue;
    }
    if (s.length === 4) {
      const n = giguetWords(book, s[0], s[1])!.length;
      if (!(Number.isInteger(s[2]) && Number.isInteger(s[3]) && s[2] >= 0 && s[2] <= s[3] && s[3] < n))
        errors.push(`Extrait hors bornes : ${label(s)} (le verset a ${n} mots)`);
    }
  }
  // 3) Zéro-perte au MOT : aucune plage déjà revendiquée par un autre verset grec ne
  //    peut être recouverte (verset entier = tous les mots). Deux extraits disjoints
  //    du même verset par deux grecs différents sont légitimes (scission Giguet).
  const claimMap = claims ?? verseClaims(book);
  for (const s of sources) {
    const mine = spanOf(s);
    for (const c of claimMap.get(vkey(s)) || []) {
      if (c.ref !== ref && overlaps(mine, c.span)) {
        errors.push(`Zéro-perte : Giguet ${label(s)} chevauche la part déjà liée au grec ${c.ref}`);
        break;
      }
    }
  }
  // 3b) Les extraits d'un même verset au sein de CE lien ne se chevauchent pas.
  for (let i = 0; i < sources.length; i++)
    for (let j = i + 1; j < sources.length; j++)
      if (vkey(sources[i]) === vkey(sources[j]) && overlaps(spanOf(sources[i]), spanOf(sources[j])))
        errors.push(`Extraits en chevauchement dans le lien : ${label(sources[i])} / ${label(sources[j])}`);
  return { ok: errors.length === 0, errors };
}

// Zéro-perte à l'échelle d'un LOT. Un réalignement décale plusieurs versets à la fois
// (glisser toute la colonne française). Validé verset par verset contre l'état COURANT,
// un simple décalage paraît revendiquer deux fois chaque Giguet — l'ancien lien identitaire
// ET le nouveau — alors que le lot est une permutation cohérente. On valide donc contre
// l'état APRÈS application du lot : on retire d'abord les revendications des grecs que le
// lot réécrit, puis on ajoute leurs nouvelles sources, et on confronte chaque changement
// à cette carte recalée. Un vrai double-emploi (deux grecs sur le même Giguet à l'arrivée)
// reste détecté ; seul le conflit transitoire du décalage disparaît.
export function checkBatch(book: string, changes: { ref: string; sources: Source[]; maison?: string; revoke?: boolean }[]): { ref: string; errors: string[] }[] {
  // Sources effectives post-lot de chaque grec touché (revoke -> retour au lien auto).
  const touched = new Map<string, Source[]>();
  for (const c of changes) {
    if (c.maison && c.maison.trim()) { touched.set(c.ref, []); continue; }
    if (c.revoke) { const auto = links()[book]?.[c.ref]; touched.set(c.ref, Array.isArray(auto) ? auto : []); continue; }
    touched.set(c.ref, c.sources);
  }
  // Carte des revendications recalée sur l'état post-lot.
  const claims = verseClaims(book);
  for (const [k, cs] of claims) claims.set(k, cs.filter((c) => !touched.has(c.ref)));
  for (const [ref, srcs] of touched)
    for (const s of srcs) {
      const k = vkey(s);
      if (!claims.has(k)) claims.set(k, []);
      claims.get(k)!.push({ ref, span: spanOf(s) });
    }
  // Valide chaque changement (intégrité par-source + zéro-perte contre la carte recalée).
  const out: { ref: string; errors: string[] }[] = [];
  for (const c of changes) {
    if (c.revoke) continue;
    const chk = checkOverride(book, c.ref, c.sources, c.maison, claims);
    if (!chk.ok) out.push({ ref: c.ref, errors: chk.errors });
  }
  return out;
}

// Version sérialisable pour l'UI (contexte du picker) : par verset Giguet, le
// grec propriétaire (verset entier) ou les extraits déjà revendiqués.
export function sourceOwners(book: string): Record<string, { ref: string; partial: boolean }> {
  const out: Record<string, { ref: string; partial: boolean }> = {};
  for (const [k, cs] of verseClaims(book)) {
    const whole = cs.find((c) => c.span[1] === Number.MAX_SAFE_INTEGER);
    out[k] = whole ? { ref: whole.ref, partial: false } : { ref: cs[0].ref, partial: true };
  }
  return out;
}

// Couverture d'un chapitre : l'ALERTE de Biblion. Deux sens contrôlés :
//  - versets grecs sans français (orphelins ou non arbitrés) ;
//  - versets Giguet (ou restes de mots après extraits) non liés à aucun grec,
//    ceux du chapitre Giguet homonyme, plus tout verset partiellement consommé
//    par un lien de CE chapitre grec.
export function chapterCoverage(book: string, ch: number) {
  const greekSide: { v: number; state: "orphan" | "unlinked" }[] = [];
  for (const gv of greekVerses(book, ch) || []) {
    const src = effectiveSources(book, `${ch}:${gv.v}`);
    if (src == null) greekSide.push({ v: gv.v, state: "unlinked" });
    else if (src.length === 0) greekSide.push({ v: gv.v, state: "orphan" });
  }

  const claims = verseClaims(book);
  const frenchSide: { ch: number; v: number; part: string; preview: string }[] = [];
  const checkVerse = (gc: number, gv: number) => {
    const words = giguetWords(book, gc, gv);
    if (!words) return;
    const cs = claims.get(`${gc}:${gv}`) || [];
    if (cs.some((c) => c.span[1] === Number.MAX_SAFE_INTEGER)) return; // verset entier consommé
    // fusionne les plages consommées, puis liste les trous
    const spans = cs.map((c) => c.span).sort((a, b) => a[0] - b[0]);
    const gaps: [number, number][] = [];
    let cursor = 0;
    for (const [f, t] of spans) {
      if (f > cursor) gaps.push([cursor, f - 1]);
      cursor = Math.max(cursor, t + 1);
    }
    if (cursor < words.length) gaps.push([cursor, words.length - 1]);
    for (const [f, t] of gaps) {
      frenchSide.push({
        ch: gc, v: gv,
        part: cs.length === 0 ? "tout le verset" : `mots ${f + 1}-${t + 1}`,
        preview: words.slice(f, Math.min(t + 1, f + 12)).join(" ") + (t - f >= 12 ? "…" : ""),
      });
    }
  };
  // chapitre Giguet homonyme en entier…
  for (const v of Object.keys(giguet()[book]?.[String(ch)] || {})) checkVerse(ch, Number(v));
  // …plus tout verset Giguet touché par un lien de ce chapitre grec (transpositions).
  const seen = new Set<string>();
  for (const [k, cs] of claims) {
    if (!cs.some((c) => c.ref.startsWith(`${ch}:`))) continue;
    const [gc, gv] = k.split(":").map(Number);
    if (gc === ch || seen.has(k)) continue;
    seen.add(k);
    checkVerse(gc, gv);
  }
  return { greekSide, frenchSide };
}

// Revendications par verset Giguet : liste {ref grec, plage de mots}, override >
// auto (les revendications auto d'un ref surchargé sont remplacées).
function verseClaims(book: string): Map<string, { ref: string; span: [number, number] }[]> {
  const m = new Map<string, { ref: string; span: [number, number] }[]>();
  const ov = overrides()[book] || {};
  const push = (ref: string, s: Source) => {
    const k = vkey(s);
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push({ ref, span: spanOf(s) });
  };
  const auto = links()[book] || {};
  for (const ref of Object.keys(auto)) {
    if (ov[ref]) continue; // surchargé : l'override remplace
    const src = auto[ref];
    if (Array.isArray(src)) for (const s of src) push(ref, s);
  }
  for (const ref of Object.keys(ov)) for (const s of ov[ref].sources) push(ref, s);
  return m;
}

export function saveOverride(book: string, ref: string, sources: Source[], by: string, note?: string, maison?: string) {
  const all = overrides();
  all[book] = all[book] || {};
  const entry: Override = { sources, by, at: new Date().toISOString() };
  if (note) entry.note = note;
  if (maison && maison.trim()) entry.maison = maison.trim();
  all[book][ref] = entry;
  writeOverrides(all);
}

export function revokeOverride(book: string, ref: string) {
  const all = overrides();
  if (all[book]) delete all[book][ref];
  writeOverrides(all);
}

function writeOverrides(all: Overrides) {
  const tmp = OV_PATH + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(all, null, 2));
  fs.renameSync(tmp, OV_PATH); // écriture atomique
}

// Vérifie le token auprès de l'API (AdonisJS /me) et exige un rôle éditeur.
// `credit` = signature d'attribution : le philologue (Biblion) signe TOUJOURS « Βιβλίον »
// (jamais son vrai nom) ; un admin signe de son nom réel (Corentin Renard, Noah Jaubert…).
export async function requireEditor(authHeader: string | null): Promise<{ ok: boolean; role?: string; name?: string; credit?: string }> {
  const token = authHeader?.replace(/^Bearer\s+/i, "");
  if (!token) return { ok: false };
  // Base ABSOLUE côté serveur (le /api relatif du client ne résout pas ici).
  const base = process.env.ARB_API_URL || "http://127.0.0.1:3333/api";
  try {
    const r = await fetch(`${base}/me`, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return { ok: false };
    const { user } = await r.json();
    const ok = user?.role === "admin" || user?.role === "philologist";
    const credit = user?.role === "philologist" ? "Βιβλίον" : user?.displayName || "Βιβλίον";
    return { ok, role: user?.role, name: user?.displayName, credit };
  } catch {
    return { ok: false };
  }
}
