import { NextResponse } from "next/server";
import { ntHistory } from "@/lib/ntMaison";

export const dynamic = "force-dynamic";

// Versions successives d'un verset du NT (l'API vérifie la permission).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const book = url.searchParams.get("book") || "";
  const ref = url.searchParams.get("ref") || "";
  const { status, body } = await ntHistory(req.headers.get("authorization") ?? "", book, ref);
  return NextResponse.json(body ?? { error: "Historique indisponible." }, { status });
}
