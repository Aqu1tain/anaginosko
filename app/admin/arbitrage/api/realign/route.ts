import { NextResponse } from "next/server";
import { requireEditor, states, effectiveSources, servedText, greekVerses, overrides, giguet, biblionQueue, validatedSet, type Source } from "@/lib/arbitration";

export const dynamic = "force-dynamic";

// Données du réalignement DEUX COLONNES d'un chapitre.
//  - grec : les versets du chapitre courant (colonne GAUCHE, fixe, autorité). Ce sont
//    les SEULS versets que l'enregistrement réécrit.
//  - bande : les versets Giguet du chapitre ET des voisins (ch-1..ch+2), en ordre
//    (colonne DROITE, glissable). Sert à tirer le bon français, y compris d'un chapitre
//    voisin (décalage inter-chapitres type 1 Chroniques), sans toucher aux autres grecs.
//  - drapeaux : versets signalés « à vérifier » par les lecteurs (divergence Phase 2),
//    montrés comme simple alerte, jamais comme un choix A/B.
export async function GET(req: Request) {
  const auth = await requireEditor(req.headers.get("authorization"));
  if (!auth.ok) return NextResponse.json({ error: "Réservé aux contributeurs." }, { status: 401 });
  const url = new URL(req.url);
  const book = url.searchParams.get("book") || "";
  const ch = Number(url.searchParams.get("ch"));
  const st = states()[book]?.[ch];
  if (!st) return NextResponse.json({ error: "Chapitre inconnu." }, { status: 404 });
  if (!st.scaled) return NextResponse.json({ error: "Chapitre non scaled : verrouillé." }, { status: 403 });
  const gv = greekVerses(book, ch);
  if (!gv) return NextResponse.json({ error: "Chapitre grec introuvable." }, { status: 404 });

  const ov = overrides()[book] || {};
  const flagged = new Set(biblionQueue().filter((c) => c.book === book).map((c) => c.grec).filter(Boolean));
  const validated = validatedSet();

  const grec = gv.map(({ v, greek }) => {
    const ref = `${ch}:${v}`;
    const sources = (effectiveSources(book, ref) || []) as Source[];
    const single = sources.length === 1 && sources[0].length === 2 ? { ch: sources[0][0], v: sources[0][1] } : null;
    return {
      v, greek, ref,
      source: sources, // brut (peut être extrait/multi)
      giguet: single, // le verset Giguet entier assigné, si mapping simple (base du glissement)
      french: servedText(book, ref),
      maison: ov[ref]?.maison || null,
      by: ov[ref]?.by || null,
      overridden: !!ov[ref],
      flagged: flagged.has(ref),
      validated: validated.has(`${book}:${ref}`),
    };
  });

  // Bande Giguet : chapitres ch-1..ch+2, en ordre (ch puis v).
  const band: { ch: number; v: number; text: string }[] = [];
  for (let c = Math.max(0, ch - 1); c <= ch + 2; c++) {
    const g = giguet()[book]?.[String(c)];
    if (!g) continue;
    for (const v of Object.keys(g).map(Number).sort((a, b) => a - b)) band.push({ ch: c, v, text: g[String(v)] });
  }

  return NextResponse.json({ book, ch, grec, band, chapterFirstIndex: band.findIndex((b) => b.ch === ch) });
}
