"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// routePrefix optionnel : sur l'accueil, on melange NT et LXX, chaque livre pointe
// vers son corpus. Sur un sommaire (corpus unique), il est absent -> on retombe sur
// le routePrefix passe en prop.
type Book = { id: string; name: string; chapters: number; routePrefix?: string };

const norm = (s: string) =>
  s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();

// Recherche de reference : on tape « Jean 3 » (ou « gen 1 », « 1co 13 ») et on saute
// au chapitre. Le nombre final = chapitre ; le reste = requete livre (nom ou id,
// insensible aux accents). Un livre n'a jamais d'id finissant par un chiffre, donc
// les chiffres de fin sont toujours le chapitre.
export default function RefJump({ books, routePrefix }: { books: Book[]; routePrefix: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const { bookQ, chapter } = useMemo(() => {
    const m = q.match(/^(.+?)\s*(\d+)?\s*$/);
    return { bookQ: norm(m?.[1] ?? ""), chapter: m?.[2] ? Number(m[2]) : null };
  }, [q]);

  const matches = useMemo(() => {
    if (!bookQ) return [];
    return books
      .filter((b) => norm(b.name).includes(bookQ) || norm(b.id).startsWith(bookQ))
      .sort((a, b) => Number(norm(b.name).startsWith(bookQ)) - Number(norm(a.name).startsWith(bookQ)))
      .slice(0, 6);
  }, [books, bookQ]);

  const chapterFor = (b: Book) => (chapter && chapter >= 1 && chapter <= b.chapters ? chapter : 1);
  const go = (b: Book | undefined) => {
    if (!b) return;
    setQ("");
    router.push(`${b.routePrefix ?? routePrefix}/${b.id}/${chapterFor(b)}`);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!matches.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(matches[active] ?? matches[0]);
    }
  };

  return (
    <div className="relative w-full">
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute left-4 top-1/2 z-10 h-[19px] w-[19px] -translate-y-1/2 text-base-content/45"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4-4" />
      </svg>
      <input
        ref={inputRef}
        type="search"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setActive(0);
        }}
        onKeyDown={onKeyDown}
        placeholder="Chercher un livre, un chapitre… (ex. Jean 3)"
        aria-label="Aller à une référence"
        autoComplete="off"
        spellCheck={false}
        className="input input-lg input-bordered w-full rounded-xl bg-base-100 pl-12 text-base text-base-content shadow-sm"
      />
      {matches.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-box border border-base-300 bg-base-100 shadow-lg">
          {matches.map((b, idx) => (
            <li key={b.id}>
              <button
                type="button"
                onMouseEnter={() => setActive(idx)}
                onClick={() => go(b)}
                className={`flex w-full items-baseline justify-between gap-3 px-3.5 py-2 text-left text-sm transition-colors ${
                  idx === active ? "bg-primary/10" : "hover:bg-base-200"
                }`}
              >
                <span className="font-medium">{b.name}</span>
                <span className="shrink-0 text-xs text-base-content/70">
                  chapitre {chapterFor(b)}
                  {b.chapters > 1 ? ` / ${b.chapters}` : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
