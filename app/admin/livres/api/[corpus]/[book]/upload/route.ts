import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { saveIntroImage } from "@/lib/bookIntros";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ corpus: string; book: string }> }) {
  const auth = await requirePermission(req.headers.get("authorization"), "review");
  if (!auth.ok) return NextResponse.json({ error: "Réservé aux éditeurs." }, { status: auth.id != null ? 403 : 401 });
  const { corpus, book } = await params;
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof Blob)) return NextResponse.json({ error: "Fichier requis." }, { status: 400 });
  const buf = Buffer.from(await file.arrayBuffer());
  const result = saveIntroImage(corpus, book, buf);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ url: result.url });
}
