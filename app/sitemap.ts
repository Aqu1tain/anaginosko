import type { MetadataRoute } from "next";
import { loadBooksFs } from "@/lib/nt-server";
import { texts } from "@/src/data/texts";

const BASE = "https://anaginosko.fr";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const books = await loadBooksFs();
  const url = (p: string) => ({ url: `${BASE}${p}` });

  return [
    url("/"),
    url("/nt"),
    url("/alphabet"),
    url("/concordance"),
    url("/mentions"),
    ...books.map((b) => url(`/nt/${b.id}`)),
    ...books.flatMap((b) =>
      Array.from({ length: b.chapters }, (_, i) => url(`/nt/${b.id}/${i + 1}`)),
    ),
    ...texts.map((t) => url(`/text/${t.id}`)),
  ];
}
