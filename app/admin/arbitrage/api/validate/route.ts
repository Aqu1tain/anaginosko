import { NextResponse } from "next/server";
import { requireEditor, setValidatedMany } from "@/lib/arbitration";

export const dynamic = "force-dynamic";

// Valide (ou dévalide) un verset à la main : « je l'ai vérifié, c'est bon, ne le
// signale plus ». Ne touche PAS au texte servi ; retire seulement le verset de la
// carte des erreurs. Tracé (by + horodatage) dans l'ARB_DIR.
export async function POST(req: Request) {
  const auth = await requireEditor(req.headers.get("authorization"));
  if (!auth.ok) return NextResponse.json({ error: "Réservé aux contributeurs." }, { status: 401 });
  const body = await req.json().catch(() => null);
  const book = body?.book as string;
  const on = body?.on !== false; // défaut : valider
  // Un verset (ref) ou tout un lot (refs) : « tout ce chapitre est bon ».
  const refs: string[] = Array.isArray(body?.refs) ? body.refs : body?.ref ? [body.ref] : [];
  const valid = refs.filter((r) => typeof r === "string" && /^\d+:\d+$/.test(r));
  if (!book || !valid.length) return NextResponse.json({ error: "book et ref(s) requis." }, { status: 400 });
  setValidatedMany(book, valid, on, auth.credit || "Βιβλίον");
  return NextResponse.json({ ok: true, validated: on, count: valid.length });
}
