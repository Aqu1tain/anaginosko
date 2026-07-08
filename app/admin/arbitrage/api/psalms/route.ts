import { NextResponse } from "next/server";
import { requireEditor, psalmsKan67, overrides } from "@/lib/arbitration";

export const dynamic = "force-dynamic";

// File des suscriptions de psaumes (28) omises par Giguet, traduites en maison (KAN-67).
// Relecture : grec + les deux témoins (maison_A/B) + décomposition. Le champ `servie`
// dit si une traduction maison a déjà été posée (override.maison sur psa <ch>:1).
export async function GET(req: Request) {
  const auth = await requireEditor(req.headers.get("authorization"));
  if (!auth.ok) return NextResponse.json({ error: "Réservé aux contributeurs." }, { status: 401 });
  const ov = overrides().psa || {};
  const suscriptions = psalmsKan67().suscriptions.map((p) => ({ ...p, servie: ov[p.ref]?.maison || null }));
  return NextResponse.json({ suscriptions, reviewer: auth.name });
}
