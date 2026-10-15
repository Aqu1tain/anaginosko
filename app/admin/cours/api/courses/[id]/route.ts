import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { deleteCourse, getCourse, saveCourse } from "@/lib/courses";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };
const denied = () => NextResponse.json({ error: "Réservé à l'équipe des cours." }, { status: 401 });

// Le cours change la liste des articles (une leçon en sort) et les pages /apprendre.
const refresh = () => {
  revalidatePath("/apprendre", "layout");
  revalidatePath("/articles");
  revalidatePath("/");
};

export async function GET(req: Request, { params }: Ctx) {
  const auth = await requirePermission(req.headers.get("authorization"), "courses");
  if (!auth.ok) return denied();
  const course = getCourse((await params).id);
  return course ? NextResponse.json({ course }) : NextResponse.json({ error: "Cours introuvable." }, { status: 404 });
}

export async function PUT(req: Request, { params }: Ctx) {
  const auth = await requirePermission(req.headers.get("authorization"), "courses");
  if (!auth.ok) return denied();
  const body = await req.json().catch(() => null);
  if (!body || typeof body.rev !== "number") return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  const result = saveCourse((await params).id, body);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  refresh();
  return NextResponse.json({ course: result.course });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const auth = await requirePermission(req.headers.get("authorization"), "courses");
  if (!auth.ok) return denied();
  if (!deleteCourse((await params).id)) return NextResponse.json({ error: "Cours introuvable." }, { status: 404 });
  refresh();
  return new NextResponse(null, { status: 204 });
}
