import { NextResponse } from "next/server";
import { requireEditor, dismissCase } from "@/lib/arbitration";

export const dynamic = "force-dynamic";

// Classe un cas de la file qui ne produit PAS d'override grec servi : un titre de
// section (KAN-55) ou un fragment de marqueur (exclusion). Le cas sort de la file
// sans toucher au texte servi ; la décision est tracée (by + horodatage) dans ARB_DIR.
export async function POST(req: Request) {
  const auth = await requireEditor(req.headers.get("authorization"));
  if (!auth.ok) return NextResponse.json({ error: "Réservé aux contributeurs." }, { status: 401 });
  const body = await req.json().catch(() => null);
  const book = body?.book as string;
  const key = body?.key as string; // grec ou giguet, identifiant du cas
  const decision = body?.decision as string; // "titre-kan55" | "marqueur-exclu" | ...
  if (!book || !key || !decision) return NextResponse.json({ error: "book, key, decision requis." }, { status: 400 });
  dismissCase(book, key, decision, auth.name || "Βιβλίον", body.note);
  return NextResponse.json({ ok: true });
}
