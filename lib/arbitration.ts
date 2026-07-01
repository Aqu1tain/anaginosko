import "server-only";
import fs from "node:fs";
import path from "node:path";

// Cœur serveur de l'arbitrage. Modèle de LIENS : un verset grec (Rahlfs, autorité)
// -> suite ordonnée de versets Giguet source (0 = orphelin, 1 = paire, 2+ = scission ;
// plusieurs grecs -> un français = fusion). On ne modifie JAMAIS le texte Giguet.
// Override (Biblion) > auto ; garanties d'intégrité sur chaque écriture.

export type Source = [number, number]; // [chapitre Giguet, verset Giguet]
export type Override = { sources: Source[]; by: string; at: string; note?: string };
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

// Applique le lien effectif d'un verset grec au fr.json servi (matérialisation
// chirurgicale : le lecteur reflète l'override immédiatement ; le build rejoue tout).
export function applyToReader(book: string, ref: string) {
  const [ch, v] = ref.split(":");
  const src = effectiveSources(book, ref);
  const frPath = path.join(LXX_DIR, book, "fr.json");
  const fr = JSON.parse(fs.readFileSync(frPath, "utf8"));
  fr[ch] = fr[ch] || {};
  if (src && src.length) fr[ch][v] = materialize(book, src);
  else delete fr[ch][v]; // orphelin-grec -> pas de français (grec seul)
  const tmp = frPath + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(fr));
  fs.renameSync(tmp, frPath);
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

// Texte matérialisé d'un lien : concaténation des versets Giguet, dans l'ordre.
export const materialize = (book: string, sources: Source[]): string =>
  sources.map((s) => giguetText(book, s[0], s[1])).filter(Boolean).join(" ").trim();

const key = (s: Source) => `${s[0]}:${s[1]}`;

// Intégrité, appliquée à CHAQUE écriture (auto ou Biblion).
export function checkOverride(book: string, ref: string, sources: Source[]): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  // 1) Les liens ne pointent que sur des versets Giguet existants.
  for (const s of sources) if (!giguetExists(book, s)) errors.push(`Verset Giguet inexistant : ${key(s)}`);
  // 2) Round-trip : la ref grec doit parser (grec = colonne fixe, jamais renumérotée).
  if (!/^\d+:\d+$/.test(ref)) errors.push(`Ref grec invalide : ${ref}`);
  // 3) Zéro-perte : aucune source Giguet déjà consommée par un AUTRE verset grec.
  //    (Chaque verset Giguet consommé au plus une fois à travers tous les liens du livre.)
  const owner = giguetOwners(book);
  for (const s of sources) {
    const used = owner.get(key(s));
    if (used && used !== ref) errors.push(`Zéro-perte : Giguet ${key(s)} déjà lié au grec ${used}`);
  }
  return { ok: errors.length === 0, errors };
}

// Carte : chaque verset Giguet -> le verset grec qui le consomme (override > auto),
// pour détecter double emploi. Le verset ref courant est ignoré par l'appelant.
function giguetOwners(book: string): Map<string, string> {
  const m = new Map<string, string>();
  const auto = links()[book] || {};
  for (const ref of Object.keys(auto)) {
    const src = auto[ref];
    if (Array.isArray(src)) for (const s of src) if (!m.has(key(s))) m.set(key(s), ref);
  }
  const ov = overrides()[book] || {};
  for (const ref of Object.keys(ov)) for (const s of ov[ref].sources) m.set(key(s), ref); // override écrase
  return m;
}

export function saveOverride(book: string, ref: string, sources: Source[], by: string, note?: string) {
  const all = overrides();
  all[book] = all[book] || {};
  all[book][ref] = { sources, by, at: new Date().toISOString(), note };
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
export async function requireEditor(authHeader: string | null): Promise<{ ok: boolean; role?: string; name?: string }> {
  const token = authHeader?.replace(/^Bearer\s+/i, "");
  if (!token) return { ok: false };
  const base = process.env.ARB_API_URL || process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:3333/api";
  try {
    const r = await fetch(`${base}/me`, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return { ok: false };
    const { user } = await r.json();
    const ok = user?.role === "admin" || user?.role === "philologist";
    return { ok, role: user?.role, name: user?.displayName };
  } catch {
    return { ok: false };
  }
}
