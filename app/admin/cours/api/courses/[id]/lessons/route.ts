import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { applyTransition, getArticle } from "@/lib/articles";
import { getCourse } from "@/lib/courses";
import { fetchReviewers } from "@/lib/reviewers";

export const dynamic = "force-dynamic";

// Actions groupées sur les leçons d'un cours. Chaque leçon passe par la même
// transition qu'un article seul : relecture par un tiers, publication réservée.
const ACTIONS = {
  submit: "draft",
  approve: "in_review",
  publish: "approved",
} as const;
type Action = keyof typeof ACTIONS;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const header = req.headers.get("authorization");
  const auth = await requirePermission(header, "courses");
  if (!auth.ok) return NextResponse.json({ error: "Réservé à l'équipe des cours." }, { status: 401 });
  const course = getCourse((await params).id);
  if (!course) return NextResponse.json({ error: "Cours introuvable." }, { status: 404 });
  const body = await req.json().catch(() => null);
  const action = body?.action as Action;
  if (!(action in ACTIONS)) return NextResponse.json({ error: "Action inconnue." }, { status: 400 });

  const reviewers = action === "publish" ? await fetchReviewers(header).catch(() => []) : [];
  const done: string[] = [];
  const refused: { title: string; error: string }[] = [];
  for (const id of course.sections.flatMap((s) => s.lessons)) {
    const a = getArticle(id);
    if (!a || a.status !== ACTIONS[action]) continue;
    const result = applyTransition(id, action, auth, undefined, { rev: a.rev, reviewer: null, activeReviewerIds: reviewers.map((r) => r.id) });
    if (result.ok) done.push(a.title);
    else refused.push({ title: a.title, error: result.error });
  }
  if (done.length) revalidatePath("/apprendre", "layout");
  return NextResponse.json({ done: done.length, refused });
}
