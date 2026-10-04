import { NextResponse } from "next/server";
import { requireEditor, coverageGaps, provenToTranslate, toTranslateCandidates, overrides, states, validatedSet } from "@/lib/arbitration";
import { LXX_BOOK_NAMES } from "@/src/data/lxx";

export const dynamic = "force-dynamic";

// Versets qui appellent une traduction maison : omissions de Giguet prouvées, puis
// candidats probables (français nettement plus court que le grec, voir
// scripts/build-a-traduire.mjs). Ce qui est déjà traduit maison ou validé disparaît.
type Item = { book: string; label: string; ref: string; kind: "prouvé" | "probable"; reason: string };

export async function GET(req: Request) {
  const auth = await requireEditor(req.headers.get("authorization"));
  if (!auth.ok) return NextResponse.json({ error: "Réservé aux contributeurs." }, { status: 401 });
  const ov = overrides();
  const st = states();
  const validated = validatedSet();
  const seen = new Set<string>();
  const items: Item[] = [];
  const add = (book: string, ref: string, kind: Item["kind"], reason: string) => {
    const key = `${book}:${ref}`;
    if (seen.has(key) || ov[book]?.[ref]?.maison || validated.has(key)) return;
    if (!st[book]?.[Number(ref.split(":")[0])]?.scaled) return;
    seen.add(key);
    items.push({ book, label: LXX_BOOK_NAMES[book] ?? book, ref, kind, reason });
  };

  for (const [book, entries] of Object.entries(coverageGaps().aTraduireProuve ?? {}))
    for (const e of entries) add(book, e.ref, "prouvé", e.cause ?? "Omission prouvée de Giguet.");
  for (const e of provenToTranslate()) add(e.book, e.grec, "prouvé", e.preuve ?? "Omission prouvée de Giguet.");
  for (const c of toTranslateCandidates())
    add(c.book, c.ref, "probable", `Français de ${c.frenchWords} mots pour ${c.greekWords} mots grecs.`);

  return NextResponse.json({ items });
}
