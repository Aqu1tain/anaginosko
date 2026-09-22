import { NextResponse } from "next/server";
import { requireEditorial } from "@/lib/auth";
import { addComment, editComment, setThreadResolved } from "@/lib/articles";
type Ctx = { params: Promise<{ id: string }> };
export async function POST(req: Request, { params }: Ctx) {
  const auth = await requireEditorial(req.headers.get("authorization"));
  if (!auth.ok) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Commentaire requis." }, { status: 400 });
  const result = addComment((await params).id, auth, body);
  return result.ok ? NextResponse.json({ article: result.article }, { status: 201 }) : NextResponse.json({ error: result.error }, { status: result.status });
}
export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await requireEditorial(req.headers.get("authorization"));
  if (!auth.ok) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  const body = await req.json().catch(() => null);
  const { id } = await params;
  const result = typeof body?.threadId === "string" && typeof body?.resolved === "boolean"
    ? setThreadResolved(id, auth, body.threadId, body.resolved)
    : typeof body?.commentId === "string" && (typeof body?.text === "string" || body?.text === null)
      ? editComment(id, auth, body.commentId, body.text)
      : { ok: false as const, status: 400, error: "Modification invalide." };
  return result.ok ? NextResponse.json({ article: result.article }) : NextResponse.json({ error: result.error }, { status: result.status });
}
