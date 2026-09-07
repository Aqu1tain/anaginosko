import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { savePhoto } from "@/lib/profiles";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await requireUser(req.headers.get("authorization"));
  if (!auth.ok) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof Blob)) return NextResponse.json({ error: "Fichier requis." }, { status: 400 });
  const buf = Buffer.from(await file.arrayBuffer());
  const result = savePhoto(auth, buf);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ profile: result.profile });
}
