import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { saveUpload } from "@/lib/articles";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(req.headers.get("authorization"), "articles");
  if (!auth.ok) return NextResponse.json({ error: "Réservé aux contributeurs." }, { status: 401 });
  const { id } = await params;
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof Blob)) return NextResponse.json({ error: "Fichier requis." }, { status: 400 });
  const buf = Buffer.from(await file.arrayBuffer());
  const result = saveUpload(id, auth, buf);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ url: result.url });
}
