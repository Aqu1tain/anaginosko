import type { MetadataRoute } from "next";
import { loadBooksFs, loadLemmasFs } from "@/lib/nt-server";
import { CORPORA } from "@/src/data/corpus";
import { texts } from "@/src/data/texts";
import { listPublished } from "@/lib/articles";
import { listProfiles } from "@/lib/profiles";

const BASE = "https://anaginosko.fr";

// Les articles sont publiés au runtime (ARTICLES_DIR), hors build : sans revalidate
// le sitemap resterait figé à l'état du build et ne les inclurait jamais.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const url = (p: string) => ({ url: `${BASE}${p}`, lastModified });

  const articleUrls: MetadataRoute.Sitemap = listPublished().map((a) => ({
    url: `${BASE}/articles/${a.slug}`,
    lastModified: new Date(a.updatedAt),
  }));

  const profileUrls: MetadataRoute.Sitemap = listProfiles().map((p) => ({
    url: `${BASE}/contributeurs/${p.slug}`,
    lastModified: new Date(p.updatedAt),
  }));

  const corpusUrls: MetadataRoute.Sitemap = [];
  for (const c of CORPORA) {
    const books = await loadBooksFs(c);
    corpusUrls.push(url(c.routePrefix), url(c.concordanceBase));
    for (const b of books) {
      corpusUrls.push(url(`${c.routePrefix}/${b.id}`));
      const chs = b.chapterList ?? Array.from({ length: b.chapters }, (_, i) => i + 1);
      for (const ch of chs) corpusUrls.push(url(`${c.routePrefix}/${b.id}/${ch}`));
    }
    // Les fiches-lemmes : le plus gros actif de contenu du site (définitions
    // Bailly, occurrences, répartition). Sans elles, le corpus lexical est
    // invisible des moteurs.
    for (const e of await loadLemmasFs(c)) {
      corpusUrls.push(url(`${c.concordanceBase}/${encodeURIComponent(e.lemma)}`));
    }
  }

  return [
    url("/"),
    url("/alphabet"),
    url("/prononciation"),
    url("/mentions"),
    url("/articles"),
    ...corpusUrls,
    ...texts.map((t) => url(`/text/${t.id}`)),
    ...articleUrls,
    ...profileUrls,
  ];
}
