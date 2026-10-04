import { NextResponse } from "next/server";
import { requireEditor } from "@/lib/arbitration";
import { loadBooksFs, loadChapterFs, loadFrenchFs } from "@/lib/nt-server";
import { ntMaison } from "@/lib/ntMaison";

export const dynamic = "force-dynamic";

// Un chapitre du NT pour l'atelier : grec, néo-Crampon et traduction maison éventuelle.
export async function GET(req: Request) {
  const auth = await requireEditor(req.headers.get("authorization"));
  if (!auth.ok) return NextResponse.json({ error: "Réservé aux contributeurs." }, { status: 401 });
  const url = new URL(req.url);
  const book = url.searchParams.get("book") || "";
  const ch = Number(url.searchParams.get("ch"));
  const meta = (await loadBooksFs()).find((b) => b.id === book);
  if (!meta || !Number.isInteger(ch) || ch < 1 || ch > meta.chapters) return NextResponse.json({ error: "Chapitre inconnu." }, { status: 404 });

  const [text, french] = await Promise.all([loadChapterFs(book, ch), loadFrenchFs(book)]);
  const greek: Record<number, string[]> = {};
  for (const m of text.mots ?? []) if (m.verse != null) (greek[m.verse] ??= []).push(m.grec);
  const crampon = french?.[ch] ?? {};
  const house = ntMaison()[book] ?? {};
  const verses = Object.keys(greek).map(Number).sort((a, b) => a - b).map((v) => {
    const ref = `${ch}:${v}`;
    return { v, ref, greek: greek[v].join(" "), crampon: crampon[v] ?? null, maison: house[ref]?.maison ?? null, by: house[ref]?.by ?? null };
  });
  return NextResponse.json({ book, label: meta.name, ch, chapters: meta.chapters, verses });
}
