import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { importBundle, listBundles } from "@/lib/courseImport";

export const dynamic = "force-dynamic";

const denied = () => NextResponse.json({ error: "Réservé à l'équipe des cours." }, { status: 401 });

// Cours rédigés dans le dépôt, prêts à être importés en brouillon.
export async function GET(req: Request) {
  const auth = await requirePermission(req.headers.get("authorization"), "courses");
  if (!auth.ok) return denied();
  return NextResponse.json({ bundles: listBundles() });
}

export async function POST(req: Request) {
  const auth = await requirePermission(req.headers.get("authorization"), "courses");
  if (!auth.ok) return denied();
  if (!auth.isRoot && !auth.permissions?.includes("articles"))
    return NextResponse.json({ error: "Permission de rédaction requise pour créer les leçons." }, { status: 403 });
  const body = await req.json().catch(() => null);
  const result = importBundle(String(body?.slug ?? ""), auth);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  revalidatePath("/apprendre", "layout");
  return NextResponse.json({ course: result.course }, { status: 201 });
}
