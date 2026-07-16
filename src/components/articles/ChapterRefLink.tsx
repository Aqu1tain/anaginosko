import Link from "next/link";
import { chapterHref, chapterRefLabel } from "@/src/data/refParse";

// Renvoi inline vers un chapitre, forme courte (« Gen 1 ») ou longue (« Genèse 1 »).
// Utilisé par le rendu public ; dans l'éditeur, l'inline content est rendu par sa spec.
export default function ChapterRefLink({
  corpus,
  book,
  chapter,
  form,
}: {
  corpus: string;
  book: string;
  chapter: number;
  form: "short" | "long";
}) {
  return (
    <Link href={chapterHref(corpus, book, chapter)} className="font-medium text-primary underline decoration-primary/40 underline-offset-2">
      {chapterRefLabel(corpus, book, chapter, form)}
    </Link>
  );
}
