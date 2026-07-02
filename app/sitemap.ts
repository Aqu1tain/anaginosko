import type { MetadataRoute } from "next";
import { loadBooksFs, loadLemmasFs } from "@/lib/nt-server";
import { texts } from "@/src/data/texts";

const BASE = "https://anaginosko.fr";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const books = await loadBooksFs();
  // Les fiches-lemmes : le plus gros actif de contenu du site (definitions
  // Bailly, occurrences, repartition). Sans elles, le corpus lexical est
  // invisible des moteurs.
  const lemmas = await loadLemmasFs();
  const lastModified = new Date();
  const url = (p: string) => ({ url: `${BASE}${p}`, lastModified });

  return [
    url("/"),
    url("/nt"),
    url("/alphabet"),
    url("/prononciation"),
    url("/concordance"),
    url("/mentions"),
    ...books.map((b) => url(`/nt/${b.id}`)),
    ...lemmas.map((e) => url(`/concordance/${encodeURIComponent(e.lemma)}`)),
    ...books.flatMap((b) =>
      Array.from({ length: b.chapters }, (_, i) => url(`/nt/${b.id}/${i + 1}`)),
    ),
    ...texts.map((t) => url(`/text/${t.id}`)),
  ];
}
