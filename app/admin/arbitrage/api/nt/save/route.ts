import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { requireEditor } from "@/lib/arbitration";
import { loadChapterFs } from "@/lib/nt-server";
import { NT_MAISON_TAG, saveNtMaison } from "@/lib/ntMaison";

export const dynamic = "force-dynamic";

// Enregistre un lot de traductions maison d'un chapitre du NT dans l'API. `maison: null`
// rend le verset au néo-Crampon. Les versets sont vérifiés contre le grec avant l'envoi.
type Change = { ref?: unknown; maison?: unknown };

export async function POST(req: Request) {
  const auth = await requireEditor(req.headers.get("authorization"));
  if (!auth.ok) return NextResponse.json({ error: "Réservé aux contributeurs." }, { status: 401 });
  const body = await req.json().catch(() => null);
  const book = typeof body?.book === "string" ? body.book : "";
  const changes: Change[] = Array.isArray(body?.changes) ? body.changes : [];
  if (!book || !changes.length) return NextResponse.json({ error: "book et changes requis." }, { status: 400 });

  const parsed: { ref: string; maison: string | null }[] = [];
  const chapters = new Set<number>();
  for (const c of changes) {
    if (typeof c.ref !== "string" || !/^\d+:\d+$/.test(c.ref)) return NextResponse.json({ errors: [`Référence invalide : ${String(c.ref)}`] }, { status: 400 });
    if (c.maison !== null && (typeof c.maison !== "string" || !c.maison.trim())) return NextResponse.json({ errors: [`${c.ref} : texte vide.`] }, { status: 400 });
    parsed.push({ ref: c.ref, maison: c.maison === null ? null : (c.maison as string).trim() });
    chapters.add(Number(c.ref.split(":")[0]));
  }
  for (const ch of chapters) {
    const verses = new Set((await loadChapterFs(book, ch).catch(() => null))?.mots?.map((m) => String(m.verse)) ?? []);
    const unknown = parsed.filter((p) => p.ref.startsWith(`${ch}:`) && !verses.has(p.ref.split(":")[1]));
    if (!verses.size || unknown.length) return NextResponse.json({ errors: [`Versets grecs inconnus : ${unknown.map((u) => u.ref).join(", ") || `${book} ${ch}`}`] }, { status: 422 });
  }

  const saved = await saveNtMaison(req.headers.get("authorization") ?? "", book, parsed);
  if (saved.status >= 300) return NextResponse.json(saved.body ?? { error: "Enregistrement refusé par l'API." }, { status: saved.status });
  revalidateTag(NT_MAISON_TAG);
  for (const ch of chapters) revalidatePath(`/nt/${book}/${ch}`);
  revalidatePath("/lectures", "layout");
  return NextResponse.json({ ok: true, applied: saved.body?.applied ?? parsed.length });
}
