"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export type NavBook = { id: string; name: string; chapters: number | number[] };
export type NavCorpus = { id: string; label: string; routePrefix: string; groups: { title: string; books: NavBook[] }[] };
export type NavPosition = { corpus: string; book: string; chapter: number };

const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const chapterList = (b: NavBook) => (Array.isArray(b.chapters) ? b.chapters : Array.from({ length: b.chapters }, (_, i) => i + 1));

// Navigateur livre puis chapitre, pour les deux corpus. Ouvert sur le livre en cours
// quand on le lance depuis un chapitre ; sinon sur la liste des livres.
export default function BibleNavigator({
  corpora,
  current,
  onNavigate,
}: {
  corpora: NavCorpus[];
  current?: NavPosition;
  onNavigate?: () => void;
}) {
  const [corpusId, setCorpusId] = useState(current?.corpus ?? corpora[0]?.id);
  const [bookId, setBookId] = useState<string | null>(current?.book ?? null);
  const [query, setQuery] = useState("");
  const corpus = corpora.find((c) => c.id === corpusId) ?? corpora[0];
  const book = corpus?.groups.flatMap((g) => g.books).find((b) => b.id === bookId) ?? null;

  const groups = useMemo(() => {
    const q = norm(query.trim());
    if (!q || !corpus) return corpus?.groups ?? [];
    return corpus.groups
      .map((g) => ({ ...g, books: g.books.filter((b) => norm(b.name).includes(q) || b.id.startsWith(q)) }))
      .filter((g) => g.books.length);
  }, [corpus, query]);

  if (!corpus) return null;

  const switchCorpus = (id: string) => {
    setCorpusId(id);
    setBookId(null);
    setQuery("");
  };

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Corpus" className="flex flex-wrap gap-2">
        {corpora.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={c.id === corpus.id}
            onClick={() => switchCorpus(c.id)}
            className={`inline-flex min-h-10 items-center rounded-full px-4 text-sm font-medium transition-colors ${
              c.id === corpus.id ? "bg-primary text-primary-content" : "bg-base-200 hover:text-accent"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {book ? (
        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-greek text-2xl font-bold">{book.name}</h3>
            <button type="button" onClick={() => setBookId(null)} className="text-sm font-medium text-primary hover:underline">
              Tous les livres
            </button>
          </div>
          <ol className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-1.5">
            {chapterList(book).map((ch) => {
              const isCurrent = current?.corpus === corpus.id && current.book === book.id && current.chapter === ch;
              return (
                <li key={ch}>
                  <Link
                    href={`${corpus.routePrefix}/${book.id}/${ch}`}
                    onClick={onNavigate}
                    aria-current={isCurrent ? "page" : undefined}
                    className={`grid h-11 place-items-center rounded-lg border text-base font-medium tabular-nums transition-colors ${
                      isCurrent
                        ? "border-primary bg-primary text-primary-content"
                        : "border-base-300 bg-base-100 hover:border-primary/40 hover:bg-base-200"
                    }`}
                  >
                    {ch === 0 ? "Pr." : ch}
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Livre
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={corpus.id === "lxx" ? "Genèse, Psaumes, Isaïe…" : "Matthieu, Romains, Apocalypse…"}
              autoComplete="off"
              className="input input-bordered h-11 w-full rounded-xl bg-base-100 font-normal"
            />
          </label>
          {groups.map((g) => (
            <section key={g.title}>
              <h3 className="mb-2 text-sm font-semibold text-base-content/70">{g.title}</h3>
              <div className="flex flex-wrap gap-1.5">
                {g.books.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setBookId(b.id)}
                    className={`inline-flex min-h-10 items-center rounded-lg border px-3 text-[0.95rem] transition-colors ${
                      current?.corpus === corpus.id && current.book === b.id
                        ? "border-primary/60 bg-primary/10"
                        : "border-base-300 bg-base-100 hover:border-primary/40"
                    }`}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            </section>
          ))}
          {!groups.length && <p className="text-sm text-base-content/70">Aucun livre ne correspond.</p>}
        </div>
      )}
    </div>
  );
}
