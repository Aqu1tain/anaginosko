import { NextResponse } from "next/server";
import { requireEditor, setValidated } from "@/lib/arbitration";

export const dynamic = "force-dynamic";

// Valide (ou dévalide) un verset à la main : « je l'ai vérifié, c'est bon, ne le
// signale plus ». Ne touche PAS au texte servi ; retire seulement le verset de la
// carte des erreurs. Tracé (by + horodatage) dans l'ARB_DIR.
export async function POST(req: Request) {
  const auth = await requireEditor(req.headers.get("authorization"));
  if (!auth.ok) return NextResponse.json({ error: "Réservé aux contributeurs." }, { status: 401 });
  const body = await req.json().catch(() => null);
  const book = body?.book as string;
  const ref = body?.ref as string;
  const on = body?.on !== false; // défaut : valider
  if (!book || !ref || !/^\d+:\d+$/.test(ref)) return NextResponse.json({ error: "book et ref requis." }, { status: 400 });
  setValidated(book, ref, on, auth.credit || "Βιβλίον");
  return NextResponse.json({ ok: true, validated: on });
}
