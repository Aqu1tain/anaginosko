import { NextResponse } from "next/server";
import { queue, states, overrides, requireEditor } from "@/lib/arbitration";

export const dynamic = "force-dynamic";

// File d'arbitrage priorisée + état de chaque chapitre (verrou scaled). Un item
// déjà tranché par Biblion (override sur sa ref) sort de la file : elle ne
// montre que ce qui attend encore son jugement.
export async function GET(req: Request) {
  const auth = await requireEditor(req.headers.get("authorization"));
  if (!auth.ok) return NextResponse.json({ error: "Réservé aux contributeurs (philologue/admin)." }, { status: 401 });
  const ov = overrides();
  const open = queue().filter((it) => !ov[it.book]?.[it.ref]);
  return NextResponse.json({ queue: open, states: states(), reviewer: auth.name });
}
