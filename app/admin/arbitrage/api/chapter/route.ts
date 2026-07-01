import { NextResponse } from "next/server";
import { requireEditor, states, queue, effectiveSources, materialize, greekVerses, overrides, giguet } from "@/lib/arbitration";

export const dynamic = "force-dynamic";

// Détail d'un chapitre grec : versets (autorité), lien effectif, français matérialisé
// (aperçu exact du lecteur), et les items de file du chapitre. Verrou scaled : un
// chapitre non scaled est INVISIBLE à Biblion (403).
export async function GET(req: Request) {
  const auth = await requireEditor(req.headers.get("authorization"));
  if (!auth.ok) return NextResponse.json({ error: "Réservé aux contributeurs." }, { status: 401 });
  const url = new URL(req.url);
  const book = url.searchParams.get("book") || "";
  const ch = Number(url.searchParams.get("ch"));
  const st = states()[book]?.[ch];
  if (!st) return NextResponse.json({ error: "Chapitre inconnu." }, { status: 404 });
  if (!st.scaled) return NextResponse.json({ error: "Chapitre non scaled — verrouillé (la passe doit tourner)." }, { status: 403 });
  const gv = greekVerses(book, ch);
  if (!gv) return NextResponse.json({ error: "Chapitre grec introuvable." }, { status: 404 });
  const ov = overrides()[book] || {};
  const rows = gv.map(({ v, greek }) => {
    const ref = `${ch}:${v}`;
    const sources = effectiveSources(book, ref);
    return {
      v, greek, ref, sources,
      french: sources && sources.length ? materialize(book, sources) : null,
      orphanGreek: Array.isArray(sources) && sources.length === 0,
      overridden: !!ov[ref],
    };
  });
  const items = queue().filter((q) => q.book === book && q.ref.split(":")[0] === String(ch));
  // Chapitres Giguet évoqués par les liens (pour situer le picker).
  const gigChapters = Object.keys(giguet()[book] || {});
  return NextResponse.json({ book, ch, state: st, rows, queueItems: items, gigChapters });
}
