import type { MetadataRoute } from "next";
import { loadBooksFs } from "@/lib/nt-server";
import { CORPORA } from "@/src/data/corpus";
import { texts } from "@/src/data/texts";

const BASE = "https://anaginosko.fr";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const url = (p: string) => ({ url: `${BASE}${p}`, lastModified });

  const corpusUrls: MetadataRoute.Sitemap = [];
  for (const c of CORPORA) {
    const books = await loadBooksFs(c);
    corpusUrls.push(url(c.routePrefix), url(c.concordanceBase));
    for (const b of books) {
      corpusUrls.push(url(`${c.routePrefix}/${b.id}`));
      const chs = b.chapterList ?? Array.from({ length: b.chapters }, (_, i) => i + 1);
      for (const ch of chs) corpusUrls.push(url(`${c.routePrefix}/${b.id}/${ch}`));
    }
  }

  return [
    url("/"),
    url("/alphabet"),
    url("/mentions"),
    ...corpusUrls,
    ...texts.map((t) => url(`/text/${t.id}`)),
  ];
}
