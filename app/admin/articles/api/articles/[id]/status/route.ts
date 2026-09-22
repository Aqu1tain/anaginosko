import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireEditorial } from "@/lib/auth";
import { applyTransition, getArticle, recordReviewNotification, type TransitionAction } from "@/lib/articles";
import { fetchReviewers, notifyReviewer } from "@/lib/reviewers";

export const dynamic = "force-dynamic";
const ACTIONS: TransitionAction[] = ["submit", "request_changes", "approve", "publish", "revise", "unpublish", "archive", "restore"];
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const header = req.headers.get("authorization");
  const auth = await requireEditorial(header);
  if (!auth.ok) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const a = getArticle(id);
  if (!a) return NextResponse.json({ error: "Article introuvable." }, { status: 404 });
  if (body?.action === "retry_notification") {
    if (a.author.userId !== auth.id || a.status !== "in_review" || !a.reviewRequest?.reviewerId)
      return NextResponse.json({ error: "Aucune notification à envoyer." }, { status: 403 });
    await sendNotification(header, a);
    return NextResponse.json({ article: getArticle(id) });
  }
  const action = body?.action as TransitionAction;
  if (!ACTIONS.includes(action)) return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
  if ((action === "submit" || action === "revise") && !auth.isRoot && !auth.permissions?.includes("articles"))
    return NextResponse.json({ error: "Permission de rédaction requise." }, { status: 403 });
  try {
    const reviewers = action === "publish" || action === "submit" ? await fetchReviewers(header) : [];
    const reviewer = body?.reviewerId == null ? null : reviewers.find(r => r.id === body.reviewerId);
    if (action === "submit" && body?.reviewerId != null && !reviewer)
      return NextResponse.json({ error: "Relecteur inactif ou non autorisé." }, { status: 400 });
    const result = applyTransition(id, action, auth, body?.note, { rev: body?.rev, reviewer, activeReviewerIds: reviewers.map(r => r.id) });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    if (action === "submit" && result.article.reviewRequest?.reviewerId) await sendNotification(header, result.article);
    revalidatePath("/articles"); revalidatePath(`/articles/${result.article.slug}`); revalidatePath("/");
    return NextResponse.json({ article: getArticle(id) });
  } catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 503 }); }
}
async function sendNotification(header: string | null, a: NonNullable<ReturnType<typeof getArticle>>) {
  const request = a.reviewRequest!;
  if (request.notification === "sent") return;
  try {
    await notifyReviewer(header, { articleId: a.id, requestId: request.id, reviewerId: request.reviewerId!, title: a.title, note: request.note });
    recordReviewNotification(a.id, request.id, true);
  } catch { recordReviewNotification(a.id, request.id, false); }
}
