import { NextResponse } from "next/server";
import { requireEditor, sinceLastVisit } from "@/lib/arbitration";

export const dynamic = "force-dynamic";

// Encart « depuis ta dernière visite » : diff des entrées d'arbitrage (installées /
// fraîches / archivées) depuis un timestamp gardé côté outil (localStorage client).
export async function GET(req: Request) {
  const auth = await requireEditor(req.headers.get("authorization"));
  if (!auth.ok) return NextResponse.json({ error: "Réservé aux contributeurs." }, { status: 401 });
  const since = new URL(req.url).searchParams.get("since") || "";
  return NextResponse.json(sinceLastVisit(since));
}
