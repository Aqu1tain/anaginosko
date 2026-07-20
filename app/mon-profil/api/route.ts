import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getMyProfile, saveProfile } from "@/lib/profiles";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireUser(req.headers.get("authorization"));
  if (!auth.ok) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  return NextResponse.json({ profile: getMyProfile(auth) });
}

export async function PUT(req: Request) {
  const auth = await requireUser(req.headers.get("authorization"));
  if (!auth.ok) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  const body = await req.json().catch(() => null);
  const result = saveProfile(auth, body ?? {});
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ profile: result.profile });
}
