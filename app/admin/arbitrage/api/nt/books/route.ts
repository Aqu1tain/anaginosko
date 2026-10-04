import { NextResponse } from "next/server";
import { requireEditor } from "@/lib/arbitration";
import { loadBooksFs } from "@/lib/nt-server";
import { ntMaison } from "@/lib/ntMaison";

export const dynamic = "force-dynamic";

// Livres et chapitres du NT, avec le nombre de versets déjà traduits maison.
export async function GET(req: Request) {
  const auth = await requireEditor(req.headers.get("authorization"));
  if (!auth.ok) return NextResponse.json({ error: "Réservé aux contributeurs." }, { status: 401 });
  const store = ntMaison();
  const books = (await loadBooksFs()).map((b) => {
    const done: Record<number, number> = {};
    for (const ref of Object.keys(store[b.id] ?? {})) done[Number(ref.split(":")[0])] = (done[Number(ref.split(":")[0])] ?? 0) + 1;
    const chapters = b.chapterList ?? Array.from({ length: b.chapters }, (_, i) => i + 1);
    return { book: b.id, label: b.name, chapters: chapters.map((ch) => ({ ch, maison: done[ch] ?? 0 })) };
  });
  return NextResponse.json({ books });
}
