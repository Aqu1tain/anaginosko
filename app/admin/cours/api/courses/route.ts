import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { createCourse, listCourses } from "@/lib/courses";
import { listAllSummaries } from "@/lib/articles";

export const dynamic = "force-dynamic";

const denied = () => NextResponse.json({ error: "Réservé à l'équipe des cours." }, { status: 401 });

// Cours et articles disponibles comme leçons.
export async function GET(req: Request) {
  const auth = await requirePermission(req.headers.get("authorization"), "courses");
  if (!auth.ok) return denied();
  return NextResponse.json({ courses: listCourses(), articles: listAllSummaries() });
}

export async function POST(req: Request) {
  const auth = await requirePermission(req.headers.get("authorization"), "courses");
  if (!auth.ok) return denied();
  const body = await req.json().catch(() => null);
  const result = createCourse(body?.title);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ course: result.course }, { status: 201 });
}
