import { NextResponse } from "next/server";
import { requireEditor, biblionQueue, overrides, dismissals, greekVerses, materialize, giguetText, type BiblionCase, type Proposition, type Source } from "@/lib/arbitration";

export const dynamic = "force-dynamic";

// File « À arbitrer » de la Phase 2 (divergences de lecteurs, quarantaines, à-traduire).
// Chaque cas porte le grec + les deux propositions en regard, enrichies de l'aperçu
// matérialisé (ce que chaque proposition SERT). Sort de la file dès que le grec cible
// a un override, ou que le cas est classé (titre/marqueur, sans override grec).
// Filtres ?book, ?cause. Tri : 1 Chroniques d'abord (le plus dense).

const BOOK_PRIORITY = ["1ch", "1ki", "sir", "ezk", "pro", "jos", "neh"];
const rank = (b: string) => { const i = BOOK_PRIORITY.indexOf(b); return i < 0 ? 99 : i; };

// Ref grec cible d'une proposition : direct (grec) ou le rattachement d'un trou.
const targetRef = (p?: Proposition, c?: BiblionCase): string | null =>
  p?.grec || p?.rattacheGrec || c?.grec || null;

function enrichProp(book: string, p?: Proposition): (Proposition & { apercu: string | null; cible: string | null }) | null {
  if (!p) return null;
  const sources = (p.sourcesEtendues || p.sources || []) as Source[];
  const cible = p.grec || p.rattacheGrec || null;
  return { ...p, cible, apercu: sources.length ? materialize(book, sources) : p.disposition === "a-traduire" ? "(à traduire — grec seul)" : null };
}

export async function GET(req: Request) {
  const auth = await requireEditor(req.headers.get("authorization"));
  if (!auth.ok) return NextResponse.json({ error: "Réservé aux contributeurs (philologue/admin)." }, { status: 401 });
  const url = new URL(req.url);
  const fBook = url.searchParams.get("book");
  const fCause = url.searchParams.get("cause");

  const ov = overrides();
  const dismissedKeys = new Set(dismissals().map((d) => `${d.book}:${d.key}`));
  const all = biblionQueue();

  // Clé stable d'un cas (grec ou giguet) pour le suivi des classements.
  const caseKey = (c: BiblionCase) => `${c.book}:${c.grec || c.giguet || ""}`;
  // Résolu = le grec cible d'une des propositions (ou du cas) porte désormais un override.
  const isResolved = (c: BiblionCase) => {
    const refs = [c.grec, targetRef(c.a, c), targetRef(c.b, c)].filter(Boolean) as string[];
    return refs.some((r) => ov[c.book]?.[r]);
  };

  const openAll = all.filter((c) => !isResolved(c) && !dismissedKeys.has(caseKey(c)));
  const filtered = openAll.filter((c) => (!fBook || c.book === fBook) && (!fCause || c.cause === fCause));

  const greekCache: Record<string, Map<number, string>> = {};
  const greekOf = (book: string, ref?: string) => {
    if (!ref) return null;
    const [ch, v] = ref.split(":").map(Number);
    const ck = `${book}:${ch}`;
    if (!greekCache[ck]) greekCache[ck] = new Map((greekVerses(book, ch) || []).map((g) => [g.v, g.greek]));
    return greekCache[ck].get(v) ?? null;
  };

  const enriched = filtered.map((c) => ({
    ...c,
    greek: greekOf(c.book, c.grec) ?? (c.giguet ? null : null),
    giguetText: c.giguet && /^\d+:\d+$/.test(c.giguet) ? giguetText(c.book, Number(c.giguet.split(":")[0]), Number(c.giguet.split(":")[1])) : c.giguet || null,
    a: enrichProp(c.book, c.a),
    b: enrichProp(c.book, c.b),
    quarantaineApercu: c.sources ? materialize(c.book, c.sources) : null,
  }));

  enriched.sort((x, y) => rank(x.book) - rank(y.book) || x.book.localeCompare(y.book) ||
    Number((x.grec || x.giguet || "0:0").split(":")[0]) - Number((y.grec || y.giguet || "0:0").split(":")[0]) ||
    Number((x.grec || x.giguet || "0:0").split(":")[1] || 0) - Number((y.grec || y.giguet || "0:0").split(":")[1] || 0));

  const byBook: Record<string, number> = {}, byCause: Record<string, number> = {};
  for (const c of openAll) { byBook[c.book] = (byBook[c.book] || 0) + 1; byCause[c.cause] = (byCause[c.cause] || 0) + 1; }

  return NextResponse.json({
    queue: enriched, total: all.length, open: openAll.length, done: all.length - openAll.length,
    byBook, byCause, reviewer: auth.name,
  });
}
