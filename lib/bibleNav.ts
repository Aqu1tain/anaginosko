import "server-only";
import { loadBooksFs } from "./nt-server";
import { NT, LXX, type CorpusConfig } from "../src/data/corpus";
import { chapterNumbers, type NtBook } from "../src/data/nt";
import type { NavCorpus } from "../src/components/BibleNavigator";

// Table des livres pour le navigateur (accueil, haut des chapitres) : les deux
// corpus, groupés comme leurs tables des matières. Les chapitres contigus ne sont
// transmis que par leur nombre, pour alléger la page.
async function navCorpus(corpus: CorpusConfig): Promise<NavCorpus> {
  const books = await loadBooksFs(corpus);
  const byId = new Map(books.map((b) => [b.id, b]));
  const navBook = (b: NtBook) => ({
    id: b.id,
    name: b.name,
    chapters: b.chapterList ? chapterNumbers(b) : b.chapters,
  });
  return {
    id: corpus.id,
    label: corpus.label,
    routePrefix: corpus.routePrefix,
    groups: corpus.editorialGroups.map((g) => ({
      title: g.title,
      books: g.ids.flatMap((id) => (byId.has(id) ? [navBook(byId.get(id)!)] : [])),
    })),
  };
}

export const loadBibleNav = (): Promise<NavCorpus[]> => Promise.all([navCorpus(NT), navCorpus(LXX)]);
