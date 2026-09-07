import { corpusById } from "@/src/data/corpus";
import { bookCard } from "./cards";

// Carte OG d'un livre : nom français + badge corpus. Partagé par les routes NT et LXX.
export async function bookOgImage(corpusId: string, book: string) {
  const corpus = corpusById(corpusId);
  return bookCard({ bookName: corpus.bookNames[book] ?? book, corpusLabel: corpus.shortLabel });
}
