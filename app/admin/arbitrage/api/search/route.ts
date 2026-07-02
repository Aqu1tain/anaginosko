import { NextResponse } from "next/server";
import { requireEditor, searchGiguet, giguet, sourceOwners } from "@/lib/arbitration";

export const dynamic = "force-dynamic";

// Picker Giguet : parcourir un chapitre entier (ch) ou chercher dans tout le livre
// par le texte (q). Chaque verset porte `linkedTo` : le verset grec qui le consomme
// déjà (contexte pour Biblion — un verset déjà lié est signalé, pas caché).
export async function GET(req: Request) {
  const auth = await requireEditor(req.headers.get("authorization"));
  if (!auth.ok) return NextResponse.json({ error: "Réservé aux contributeurs." }, { status: 401 });
  const url = new URL(req.url);
  const book = url.searchParams.get("book") || "";
  const q = url.searchParams.get("q");
  const ch = url.searchParams.get("ch");
  const owners = sourceOwners(book);
  const enrich = (r: { ch: number; v: number; text: string }) => {
    const o = owners[`${r.ch}:${r.v}`];
    return { ...r, linkedTo: o?.ref ?? null, partial: o?.partial ?? false };
  };
  if (ch != null) {
    const g = giguet()[book]?.[ch] || {};
    const results = Object.keys(g)
      .map(Number)
      .sort((a, b) => a - b)
      .map((v) => enrich({ ch: Number(ch), v, text: g[String(v)] }));
    return NextResponse.json({ results });
  }
  return NextResponse.json({ results: searchGiguet(book, q || "").map(enrich) });
}
