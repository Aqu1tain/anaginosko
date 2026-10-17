import { requireEditor } from "@/lib/arbitration";
import { houseMaison } from "@/lib/ntMaison";
import { verseLemmas } from "@/lib/verseLemmas";
import { NT, LXX } from "@/src/data/corpus";

export const dynamic = "force-dynamic";

// Export texte d'un livre : la traduction maison publiée, verset par verset, les
// versets non traduits marqués comme tels.
export async function GET(req: Request) {
  const auth = await requireEditor(req.headers.get("authorization"));
  if (!auth.ok) return new Response("Réservé aux traducteurs.", { status: 401 });
  const params = new URL(req.url).searchParams;
  const corpus = params.get("corpus") === "lxx" ? LXX : NT;
  const book = params.get("book") ?? "";
  const refs = [...(await verseLemmas(corpus)).keys()].filter((k) => k.startsWith(`${book} `)).map((k) => k.slice(book.length + 1));
  if (!refs.length) return new Response("Livre inconnu.", { status: 404 });
  const house = (await houseMaison(corpus.id))[book] ?? {};
  const name = corpus.bookNames[book] ?? book;
  const lines = [`# ${name}`];
  let chapter = "";
  for (const ref of refs) {
    const [ch, v] = ref.split(":");
    if (ch !== chapter) lines.push("", `## ${name} ${(chapter = ch)}`, "");
    lines.push(`${v}. ${house[ref]?.maison ?? "[non traduit]"}`);
  }
  return new Response(`${lines.join("\n")}\n`, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${corpus.id}-${book}.md"`,
    },
  });
}
