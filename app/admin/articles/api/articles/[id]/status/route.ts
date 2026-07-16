import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireEditor } from "@/lib/auth";
import { applyTransition, type TransitionAction } from "@/lib/articles";

export const dynamic = "force-dynamic";

const ACTIONS: TransitionAction[] = ["submit", "request_changes", "approve", "unpublish", "archive", "restore"];

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireEditor(req.headers.get("authorization"));
  if (!auth.ok) return NextResponse.json({ error: "Réservé aux contributeurs." }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const action = body?.action as TransitionAction;
  if (!ACTIONS.includes(action)) return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
  const result = applyTransition(id, action, auth, body?.note);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  // Publication ou retrait : rafraîchir la liste et la page publique.
  revalidatePath("/articles");
  revalidatePath(`/articles/${result.article.slug}`);
  return NextResponse.json({ article: result.article });
}
