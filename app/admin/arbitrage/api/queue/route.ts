import { NextResponse } from "next/server";
import { queue, states, requireEditor } from "@/lib/arbitration";

export const dynamic = "force-dynamic";

// File d'arbitrage priorisée + état de chaque chapitre (verrou scaled).
export async function GET(req: Request) {
  const auth = await requireEditor(req.headers.get("authorization"));
  if (!auth.ok) return NextResponse.json({ error: "Réservé aux contributeurs (philologue/admin)." }, { status: 401 });
  return NextResponse.json({ queue: queue(), states: states(), reviewer: auth.name });
}
