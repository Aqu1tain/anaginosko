import { corpusById } from "@/src/data/corpus";
import { loadChapterFs } from "@/lib/nt-server";
import { chapterRefLabel } from "@/src/data/refParse";
import { passageCard } from "./cards";

// Carte OG d'un chapitre : référence + grec d'ouverture (premier verset). Partagé
// par les routes NT et LXX. Le grec est chargé au runtime (NT_DATA_DIR/LXX_DATA_DIR).
export async function chapterOgImage(corpusId: string, book: string, chapterStr: string) {
  const chapter = Number(chapterStr);
  const corpus = corpusById(corpusId);
  let greek: string | null = null;
  try {
    const text = await loadChapterFs(book, chapter, corpus);
    const byVerse: Record<number, string[]> = {};
    for (const m of text.mots ?? []) {
      if (m.verse == null) continue;
      (byVerse[m.verse] ??= []).push(m.grec);
    }
    const firstVerse = Object.keys(byVerse).map(Number).sort((a, b) => a - b)[0];
    if (firstVerse != null) greek = byVerse[firstVerse].join(" ");
  } catch {
    greek = null;
  }
  return passageCard({
    refLabel: chapterRefLabel(corpusId, book, chapter, "long"),
    corpusLabel: corpus.shortLabel,
    greek,
  });
}
