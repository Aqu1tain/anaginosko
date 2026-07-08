import { NextResponse } from "next/server";
import { requireEditor, activityLog } from "@/lib/arbitration";

export const dynamic = "force-dynamic";

// Journal d'activité partagé : Biblion et les admins voient ce que l'autre fait
// (liens, traductions maison, validations), du plus récent au plus ancien.
export async function GET(req: Request) {
  const auth = await requireEditor(req.headers.get("authorization"));
  if (!auth.ok) return NextResponse.json({ error: "Réservé aux contributeurs." }, { status: 401 });
  return NextResponse.json({ entries: activityLog(300), reviewer: auth.name });
}
