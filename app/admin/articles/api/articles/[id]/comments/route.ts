import { NextResponse } from "next/server";
import { requireEditor } from "@/lib/auth";
import { addComment, setCommentResolved, setThreadResolved } from "@/lib/articles";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const auth = await requireEditor(req.headers.get("authorization"));
  if (!auth.ok) return NextResponse.json({ error: "Réservé aux contributeurs." }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const result = addComment(id, auth, { text: body?.text, blockId: body?.blockId });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ article: result.article }, { status: 201 });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await requireEditor(req.headers.get("authorization"));
  if (!auth.ok) return NextResponse.json({ error: "Réservé aux contributeurs." }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (typeof body?.resolved === "boolean" && Object.prototype.hasOwnProperty.call(body, "blockId")) {
    if (body.blockId !== null && typeof body.blockId !== "string")
      return NextResponse.json({ error: "blockId invalide." }, { status: 400 });
    const result = setThreadResolved(id, auth, body.blockId, body.resolved);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ article: result.article });
  }
  if (typeof body?.commentId !== "string" || typeof body?.resolved !== "boolean")
    return NextResponse.json({ error: "commentId et resolved requis." }, { status: 400 });
  const result = setCommentResolved(id, auth, body.commentId, body.resolved);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ article: result.article });
}
