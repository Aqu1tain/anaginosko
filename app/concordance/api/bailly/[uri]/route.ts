import { NextResponse } from "next/server";
import { loadBaillyNotice } from "@/lib/bailly-server";

export async function GET(_req: Request, { params }: { params: Promise<{ uri: string }> }) {
  const { uri } = await params;
  const { notice, error } = await loadBaillyNotice(decodeURIComponent(uri));
  if (!notice) {
    return NextResponse.json({ notice: null, error }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json(
    { notice },
    { headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" } },
  );
}
