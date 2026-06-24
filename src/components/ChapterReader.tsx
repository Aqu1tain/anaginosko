import { useEffect, useState } from "react";
import type { Text } from "../data/texts";
import { loadBooks, loadChapter, bookById } from "../data/nt";
import Reader from "./Reader";

export default function ChapterReader({
  book,
  chapter,
  highlight,
}: {
  book: string;
  chapter: number;
  highlight: number | null;
}) {
  const [text, setText] = useState<Text | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    setText(null);
    setError(false);
    Promise.all([loadChapter(book, chapter), loadBooks()])
      .then(([t, books]) => {
        if (!alive) return;
        setText(t);
        setCount(bookById(books, book)?.chapters ?? null);
      })
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [book, chapter]);

  if (error) {
    return (
      <div className="py-20 text-center text-base-content/70">
        <p>Chapitre introuvable.</p>
        <a href={`#/nt/${book}`} className="link link-primary mt-3 inline-block">
          Retour au livre
        </a>
      </div>
    );
  }

  if (!text) {
    return (
      <div className="flex justify-center py-20">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  const hasPrev = chapter > 1;
  const hasNext = count != null && chapter < count;

  return (
    <>
      <Reader key={text.id} text={text} highlight={highlight} />
      <nav className="mt-8 flex items-center justify-between gap-3">
        {hasPrev ? (
          <a href={`#/nt/${book}/${chapter - 1}`} className="btn btn-sm btn-outline border-base-300">
            ← Chapitre {chapter - 1}
          </a>
        ) : (
          <span />
        )}
        <a href={`#/nt/${book}`} className="btn btn-sm btn-ghost">
          Chapitres
        </a>
        {hasNext ? (
          <a href={`#/nt/${book}/${chapter + 1}`} className="btn btn-sm btn-outline border-base-300">
            Chapitre {chapter + 1} →
          </a>
        ) : (
          <span />
        )}
      </nav>
    </>
  );
}
