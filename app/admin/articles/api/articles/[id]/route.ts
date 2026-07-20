import { NextResponse } from "next/server";
import { requireEditor } from "@/lib/auth";
import { getArticle, saveArticle, deleteArticle } from "@/lib/articles";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const auth = await requireEditor(req.headers.get("authorization"));
  if (!auth.ok) return NextResponse.json({ error: "Réservé aux contributeurs." }, { status: 401 });
  const { id } = await params;
  const a = getArticle(id);
  if (!a) return NextResponse.json({ error: "Article introuvable." }, { status: 404 });
  if (auth.role !== "admin" && a.author.userId !== auth.id)
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  return NextResponse.json({ article: a });
}

export async function PUT(req: Request, { params }: Ctx) {
  const auth = await requireEditor(req.headers.get("authorization"));
  if (!auth.ok) return NextResponse.json({ error: "Réservé aux contributeurs." }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body.rev !== "number")
    return NextResponse.json({ error: "rev requis." }, { status: 400 });
  const result = saveArticle(id, auth, body);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ article: result.article });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const auth = await requireEditor(req.headers.get("authorization"));
  if (!auth.ok) return NextResponse.json({ error: "Réservé aux contributeurs." }, { status: 401 });
  const { id } = await params;
  const result = deleteArticle(id, auth);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}
