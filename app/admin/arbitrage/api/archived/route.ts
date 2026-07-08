import { NextResponse } from "next/server";
import { requireEditor, archivedEntries, greekVerses } from "@/lib/arbitration";

export const dynamic = "force-dynamic";

// Section « Archivées » : retraites justifiées d'overrides (ex. les 11 Job, corrects
// sur une donnée qui mentait, rendus inutiles par le correctif d'ingestion). Message
// explicite : l'alignement de Biblion était juste ; c'est la donnée qui a été réparée.
export async function GET(req: Request) {
  const auth = await requireEditor(req.headers.get("authorization"));
  if (!auth.ok) return NextResponse.json({ error: "Réservé aux contributeurs." }, { status: 401 });
  const entries = archivedEntries().map((e) => {
    const [ch, v] = e.ref.split(":").map(Number);
    const greek = new Map((greekVerses(e.book, ch) || []).map((g) => [g.v, g.greek])).get(v) ?? null;
    return {
      ...e, greek,
      message: e.book === "job"
        ? "Contournement d'un bug de donnée, corrigé. Ton alignement était juste : le parser réparé (Giguet 25 = Baldad restauré) rend le lien automatique correct, ton override n'est plus nécessaire, pas une correction de ta part."
        : "Override archivé (retraite justifiée, provenance conservée).",
    };
  });
  return NextResponse.json({ entries });
}
