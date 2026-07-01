import { NextResponse } from "next/server";
import { requireEditor, states, checkOverride, saveOverride, revokeOverride, applyToReader, effectiveSources, materialize, type Source } from "@/lib/arbitration";

export const dynamic = "force-dynamic";

// Enregistre (ou révoque) une décision d'arbitrage. Intégrité sur CHAQUE écriture :
// existence des versets Giguet, ref grec valide (round-trip), zéro-perte (aucun
// verset Giguet consommé deux fois). Refus si violation — jamais d'état faux.
export async function POST(req: Request) {
  const auth = await requireEditor(req.headers.get("authorization"));
  if (!auth.ok) return NextResponse.json({ error: "Réservé aux contributeurs." }, { status: 401 });
  const body = await req.json().catch(() => null);
  const book = body?.book as string;
  const ref = body?.ref as string;
  if (!book || !ref) return NextResponse.json({ error: "book et ref requis." }, { status: 400 });

  const st = states()[book]?.[Number(ref.split(":")[0])];
  if (!st?.scaled) return NextResponse.json({ error: "Chapitre non scaled — verrouillé." }, { status: 403 });

  // Révocation : retour à l'auto (l'humain corrige l'humain).
  if (body.revoke) {
    revokeOverride(book, ref);
    applyToReader(book, ref);
    const src = effectiveSources(book, ref);
    return NextResponse.json({ ok: true, revoked: true, preview: src ? materialize(book, src) : null });
  }

  const sources = (body.sources ?? []) as Source[];
  const check = checkOverride(book, ref, sources);
  if (!check.ok) return NextResponse.json({ ok: false, errors: check.errors }, { status: 422 });
  saveOverride(book, ref, sources, auth.name || "biblion", body.note);
  applyToReader(book, ref); // matérialisation immédiate
  return NextResponse.json({ ok: true, preview: sources.length ? materialize(book, sources) : null });
}
