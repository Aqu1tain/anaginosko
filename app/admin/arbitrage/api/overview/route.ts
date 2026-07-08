import { NextResponse } from "next/server";
import { requireEditor, coverageGaps, biblionQueue, overrides, states, validatedSet } from "@/lib/arbitration";

export const dynamic = "force-dynamic";

// Carte des erreurs : les livres où il reste des versets À REVOIR (grec sans français,
// trous, versets signalés par les lecteurs), regroupés par chapitre. Ce que Biblion a
// déjà tranché (override) N'APPARAÎT PAS. Les livres complets non plus. Trié : pire d'abord.
const BOOK: Record<string, string> = {
  gen: "Genèse", exo: "Exode", lev: "Lévitique", num: "Nombres", deu: "Deutéronome", jos: "Josué", jdg: "Juges", rut: "Ruth",
  "1sa": "1 Samuel", "2sa": "2 Samuel", "1ki": "1 Rois", "2ki": "2 Rois", "1ch": "1 Chroniques", "2ch": "2 Chroniques",
  esd: "Esdras", neh: "Néhémie", est: "Esther", job: "Job", psa: "Psaumes", pro: "Proverbes", ecc: "Ecclésiaste", sng: "Cantique",
  isa: "Isaïe", jer: "Jérémie", lam: "Lamentations", ezk: "Ézéchiel", dan: "Daniel", hos: "Osée", jol: "Joël", amo: "Amos",
  oba: "Abdias", jon: "Jonas", mic: "Michée", nam: "Nahum", hab: "Habacuc", zep: "Sophonie", hag: "Aggée", zec: "Zacharie", mal: "Malachie",
  sus: "Suzanne", bel: "Bel", tob: "Tobie", jdt: "Judith", "1ma": "1 Maccabées", "2ma": "2 Maccabées", wis: "Sagesse", sir: "Siracide", bar: "Baruch", lje: "Lettre de Jérémie",
};

export async function GET(req: Request) {
  const auth = await requireEditor(req.headers.get("authorization"));
  if (!auth.ok) return NextResponse.json({ error: "Réservé aux contributeurs." }, { status: 401 });
  const gaps = coverageGaps();
  const ov = overrides();
  const st = states();
  const validated = validatedSet();

  // book -> ch -> Set(ref) des versets à revoir (dédupliqués), hors ceux déjà tranchés ou validés.
  const map: Record<string, Record<string, Set<string>>> = {};
  const add = (book: string, ref?: string) => {
    if (!ref || !/^\d+:\d+$/.test(ref)) return;
    if (ov[book]?.[ref]) return; // déjà tranché par Biblion -> pas re-signalé
    if (validated.has(`${book}:${ref}`)) return; // vérifié à la main « c'est bon » -> pas re-signalé
    const ch = ref.split(":")[0];
    if (!st[book]?.[Number(ch)]?.scaled) return; // chapitre verrouillé : hors périmètre
    ((map[book] = map[book] || {})[ch] = map[book][ch] || new Set()).add(ref);
  };
  for (const b of Object.keys(gaps.greekSansEtat || {})) for (const e of gaps.greekSansEtat![b]) add(b, e.ref);
  for (const b of Object.keys(gaps.trous || {})) for (const e of gaps.trous![b]) add(b, e.ref);
  for (const c of biblionQueue()) if (c.grec) add(c.book, c.grec);

  const books = Object.keys(map).map((book) => {
    const chapters = Object.keys(map[book]).map((ch) => ({ ch: Number(ch), count: map[book][ch].size })).sort((a, b) => a.ch - b.ch);
    return { book, label: BOOK[book] ?? book, total: chapters.reduce((s, c) => s + c.count, 0), chapters };
  }).sort((a, b) => b.total - a.total);

  const grandTotal = books.reduce((s, b) => s + b.total, 0);
  return NextResponse.json({ books, grandTotal, reviewer: auth.name });
}
