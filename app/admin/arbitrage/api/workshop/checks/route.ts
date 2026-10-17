import { NextResponse } from "next/server";
import { requireEditor } from "@/lib/arbitration";
import { houseMaison } from "@/lib/ntMaison";
import { verseLemmas } from "@/lib/verseLemmas";
import { NT, LXX } from "@/src/data/corpus";
import { checkVerse } from "@/src/components/workshop/checks";
import type { KeyTerm } from "@/src/lib/workshopApi";

export const dynamic = "force-dynamic";

const API = process.env.ARB_API_URL || "http://127.0.0.1:3333/api";

// Vérifications de tout un corpus : chaque verset publié ou en cours passe les mêmes
// contrôles que dans l'éditeur (typographie, termes clés).
export async function GET(req: Request) {
  const header = req.headers.get("authorization") ?? "";
  const auth = await requireEditor(header);
  if (!auth.ok) return NextResponse.json({ error: "Réservé aux traducteurs." }, { status: 401 });
  const corpus = new URL(req.url).searchParams.get("corpus") === "lxx" ? LXX : NT;
  const api = (p: string) => fetch(`${API}${p}`, { cache: "no-store", headers: { Authorization: header } }).then((r) => r.json());

  const [published, lemmas, { terms }, { drafts }] = await Promise.all([
    houseMaison(corpus.id),
    verseLemmas(corpus),
    api("/workshop/terms") as Promise<{ terms: KeyTerm[] }>,
    api(`/workshop/drafts?corpus=${corpus.id}`) as Promise<{ drafts: { book: string; ref: string; text: string | null; status: string }[] }>,
  ]);
  const termMap = new Map(terms.map((t) => [t.lemma, t]));
  const texts = new Map<string, { book: string; ref: string; text: string; status: string }>();
  for (const [book, refs] of Object.entries(published)) for (const [ref, e] of Object.entries(refs)) texts.set(`${book} ${ref}`, { book, ref, text: e.maison, status: "published" });
  for (const d of drafts) if (d.text) texts.set(`${d.book} ${d.ref}`, { book: d.book, ref: d.ref, text: d.text, status: d.status });

  const issues = [...texts.entries()].flatMap(([key, v]) => checkVerse(v.text, lemmas.get(key) ?? [], termMap).map((i) => ({ ...v, ...i })));
  return NextResponse.json({ checked: texts.size, issues });
}
