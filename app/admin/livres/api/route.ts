import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { listBookIntros } from "@/lib/bookIntros";

export const dynamic = "force-dynamic";

// Statuts des intros (sans le contenu) pour la liste des livres.
export async function GET(req: Request) {
  const auth = await requirePermission(req.headers.get("authorization"), "review");
  if (!auth.ok) return NextResponse.json({ error: "Réservé aux éditeurs." }, { status: auth.id != null ? 403 : 401 });
  const intros = listBookIntros().map((i) => ({ corpus: i.corpus, book: i.book, published: i.published }));
  return NextResponse.json({ intros });
}
