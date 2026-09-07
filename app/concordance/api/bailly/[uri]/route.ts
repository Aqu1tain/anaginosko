import { NextResponse } from "next/server";
import { fetchBaillyNotice } from "@/lib/bailly-server";

export async function GET(_req: Request, { params }: { params: Promise<{ uri: string }> }) {
  const { uri } = await params;
  const notice = await fetchBaillyNotice(decodeURIComponent(uri));
  if (!notice) {
    return NextResponse.json({ notice: null }, { status: 404, headers: { "Cache-Control": "public, max-age=3600" } });
  }
  return NextResponse.json(
    { notice },
    { headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" } },
  );
}
