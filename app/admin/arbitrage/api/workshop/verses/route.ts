import { NextResponse } from "next/server";
import { requireEditor } from "@/lib/arbitration";
import { verseCounts } from "@/lib/verseCounts";
import { NT, LXX } from "@/src/data/corpus";

export const dynamic = "force-dynamic";

// Nombre de versets grecs par livre : la base du taux de couverture de l'atelier.
export async function GET(req: Request) {
  const auth = await requireEditor(req.headers.get("authorization"));
  if (!auth.ok) return NextResponse.json({ error: "Réservé aux traducteurs." }, { status: 401 });
  const corpus = new URL(req.url).searchParams.get("corpus") === "lxx" ? LXX : NT;
  return NextResponse.json({ verses: await verseCounts(corpus) });
}
