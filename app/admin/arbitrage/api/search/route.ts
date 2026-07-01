import { NextResponse } from "next/server";
import { requireEditor, searchGiguet, giguet } from "@/lib/arbitration";

export const dynamic = "force-dynamic";

// Picker cherry-pick : cherche n'importe quel verset Giguet du livre par le texte
// (q), ou renvoie un chapitre Giguet entier (ch) pour parcourir.
export async function GET(req: Request) {
  const auth = await requireEditor(req.headers.get("authorization"));
  if (!auth.ok) return NextResponse.json({ error: "Réservé aux contributeurs." }, { status: 401 });
  const url = new URL(req.url);
  const book = url.searchParams.get("book") || "";
  const q = url.searchParams.get("q");
  const ch = url.searchParams.get("ch");
  if (ch != null) {
    const g = giguet()[book]?.[ch] || {};
    const results = Object.keys(g).map((v) => ({ ch: Number(ch), v: Number(v), text: g[v] }));
    return NextResponse.json({ results });
  }
  return NextResponse.json({ results: searchGiguet(book, q || "") });
}
