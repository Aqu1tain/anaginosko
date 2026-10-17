import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { overrides, requireEditor } from "@/lib/arbitration";
import { forgetHouseMaison, houseTag } from "@/lib/ntMaison";

export const dynamic = "force-dynamic";

const API = process.env.ARB_API_URL || "http://127.0.0.1:3333/api";
const credit = (by: string | undefined) => (by === "Admin" ? "Corentin Renard" : by || "Βιβλίον");

// Traductions maison existantes de la Septante (fichier d'arbitrage) : leur nombre,
// et leur reprise dans l'API pour qu'elles entrent dans l'atelier.
function entries() {
  const out: { book: string; ref: string; text: string; translator: string }[] = [];
  for (const [book, refs] of Object.entries(overrides())) {
    if (book.startsWith("_") || !refs || typeof refs !== "object") continue;
    for (const [ref, o] of Object.entries(refs)) if (o?.maison?.trim()) out.push({ book, ref, text: o.maison.trim(), translator: credit(o.by) });
  }
  return out;
}

export async function GET(req: Request) {
  const auth = await requireEditor(req.headers.get("authorization"));
  if (!auth.ok) return NextResponse.json({ error: "Réservé aux traducteurs." }, { status: 401 });
  return NextResponse.json({ count: entries().length });
}

export async function POST(req: Request) {
  const header = req.headers.get("authorization") ?? "";
  const auth = await requireEditor(header);
  if (!auth.ok) return NextResponse.json({ error: "Réservé aux traducteurs." }, { status: 401 });
  const list = entries();
  let imported = 0;
  for (let i = 0; i < list.length; i += 1000) {
    const res = await fetch(`${API}/workshop/import`, {
      method: "POST",
      cache: "no-store",
      headers: { Authorization: header, "Content-Type": "application/json" },
      body: JSON.stringify({ corpus: "lxx", entries: list.slice(i, i + 1000) }),
      signal: AbortSignal.timeout(30_000),
    });
    const out = await res.json().catch(() => null);
    if (!res.ok) return NextResponse.json(out ?? { error: "API indisponible." }, { status: res.status });
    imported += out?.imported ?? 0;
  }
  forgetHouseMaison("lxx");
  revalidateTag(houseTag("lxx"));
  revalidatePath("/lxx", "layout");
  return NextResponse.json({ ok: true, imported, total: list.length });
}
