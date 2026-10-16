import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { requireEditor } from "@/lib/arbitration";
import { forgetHouseMaison, houseTag } from "@/lib/ntMaison";
import { corpusById } from "@/src/data/corpus";

export const dynamic = "force-dynamic";

const API = process.env.ARB_API_URL || "http://127.0.0.1:3333/api";

// Relecture d'un lot de versets : transmise à l'API, puis les pages du lecteur
// concernées sont régénérées pour afficher aussitôt les versets validés.
export async function POST(req: Request) {
  const header = req.headers.get("authorization") ?? "";
  const auth = await requireEditor(header);
  if (!auth.ok) return NextResponse.json({ error: "Réservé aux traducteurs." }, { status: 401 });
  const body = await req.json().catch(() => null);
  const res = await fetch(`${API}/workshop/review`, {
    method: "POST",
    cache: "no-store",
    headers: { Authorization: header, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  const out = await res.json().catch(() => null);
  if (res.ok && body?.action === "approve") {
    const corpus = String(body.corpus);
    forgetHouseMaison(corpus);
    revalidateTag(houseTag(corpus));
    const prefix = corpusById(corpus).routePrefix;
    const chapters = new Set<string>((Array.isArray(body.refs) ? body.refs : []).map((r: string) => String(r).split(":")[0]));
    for (const ch of chapters) revalidatePath(`${prefix}/${body.book}/${ch}`);
    revalidatePath("/lectures", "layout");
  }
  return NextResponse.json(out ?? { error: "API indisponible." }, { status: res.status });
}
