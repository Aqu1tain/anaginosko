import { NextResponse } from "next/server";
import { requireEditorial } from "@/lib/auth";
import { fetchReviewers } from "@/lib/reviewers";
export async function GET(req: Request) {
  const header = req.headers.get("authorization");
  const auth = await requireEditorial(header);
  if (!auth.ok) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  try { return NextResponse.json({ reviewers: await fetchReviewers(header) }); }
  catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 503 }); }
}
