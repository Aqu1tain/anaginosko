import { useEffect, useState } from "react";
import { loadBooks, bookById, NT_GROUPS, type NtBook } from "../data/nt";

function useBooks() {
  const [books, setBooks] = useState<NtBook[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let alive = true;
    loadBooks()
      .then((b) => alive && setBooks(b))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, []);
  return { books, error };
}

function Loading() {
  return (
    <div className="flex justify-center py-20">
      <span className="loading loading-spinner loading-lg text-primary" />
    </div>
  );
}

export function NtToc() {
  const { books, error } = useBooks();
  if (error) return <p className="py-20 text-center text-base-content/70">Chargement impossible.</p>;
  if (!books) return <Loading />;

  return (
    <div className="pb-4">
      <h1 className="pt-6 text-2xl font-bold">Nouveau Testament</h1>
      <p className="mt-1 mb-2 text-sm text-base-content/70">27 livres · texte grec SBLGNT</p>

      {NT_GROUPS.map((group) => (
        <section key={group.title} className="pt-5">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-base-content/55">
            {group.title}
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {group.ids.map((id) => {
              const b = bookById(books, id);
              if (!b) return null;
              return (
                <a
                  key={id}
                  href={`#/nt/${id}`}
                  className="flex items-center justify-between gap-2 rounded-box border border-base-300 bg-base-100 px-3.5 py-2.5 transition-colors hover:border-primary/40"
                >
                  <span className="min-w-0 truncate font-medium">{b.name}</span>
                  <span className="badge badge-sm badge-ghost shrink-0">{b.chapters}</span>
                </a>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

export function NtBookView({ book }: { book: string }) {
  const { books, error } = useBooks();
  if (error) return <p className="py-20 text-center text-base-content/70">Chargement impossible.</p>;
  if (!books) return <Loading />;
  const b = bookById(books, book);
  if (!b) {
    return (
      <div className="py-20 text-center text-base-content/70">
        <p>Livre introuvable.</p>
        <a href="#/nt" className="link link-primary mt-3 inline-block">
          Nouveau Testament
        </a>
      </div>
    );
  }

  return (
    <div className="pb-4 pt-6">
      <a href="#/nt" className="link link-primary text-sm">
        ← Nouveau Testament
      </a>
      <h1 className="mt-2 text-2xl font-bold">{b.name}</h1>
      <p className="mt-1 mb-3 text-sm text-base-content/70">
        {b.chapters} chapitre{b.chapters > 1 ? "s" : ""}
      </p>
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-8">
        {Array.from({ length: b.chapters }, (_, i) => i + 1).map((ch) => (
          <a
            key={ch}
            href={`#/nt/${book}/${ch}`}
            className="grid aspect-square place-items-center rounded-box border border-base-300 bg-base-100 text-lg font-medium transition-colors hover:border-primary/40 hover:bg-base-200"
          >
            {ch}
          </a>
        ))}
      </div>
    </div>
  );
}
