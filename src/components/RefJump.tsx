"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ChapterId } from "../data/corpus";
import { estherPlace, parseEstherAddition, type Place } from "../data/refParse";

// routePrefix optionnel : sur l'accueil, on melange NT et LXX, chaque livre pointe
// vers son corpus. Sur un sommaire (corpus unique), il est absent -> on retombe sur
// le routePrefix passe en prop.
type Book = { id: string; name: string; chapters: number; chapterList?: ChapterId[]; routePrefix?: string };

type Option = { key: string; label: string; detail: string; href: string; greek?: boolean };

const norm = (s: string) =>
  s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();

const GREEK = /[Ͱ-Ͽἀ-῿]/;

const matches = (b: Book, bookQ: string) => norm(b.name).includes(bookQ) || norm(b.id).startsWith(bookQ);

const hasChapter = (b: Book, chapter: number) =>
  b.chapterList ? b.chapterList.includes(chapter) : chapter >= 1 && chapter <= b.chapters;

const placeDetail = ({ chapter, verse }: Place) =>
  `${typeof chapter === "string" ? "addition" : "chapitre"} ${chapter}${verse ? `, verset ${verse}` : ""}`;

// Recherche de reference : on tape « Jean 3 », « Jean 3, 16 » (ou « gen 1 », « 1co 13 »)
// et on saute au chapitre, voire au verset. Un livre n'a jamais d'id finissant par un
// chiffre, donc les nombres de fin sont toujours chapitre puis verset. Une saisie en
// grec part vers la concordance.
export default function RefJump({
  books,
  routePrefix,
  id,
  placeholder = "Livre, chapitre, verset…",
  submitLabel,
}: {
  books: Book[];
  routePrefix: string;
  id?: string;
  placeholder?: string;
  submitLabel?: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  // `open` permet à Échap de fermer les suggestions sans vider la saisie.
  const [open, setOpen] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const options = useMemo<Option[]>(() => {
    const term = q.trim();
    if (!term) return [];
    if (GREEK.test(term)) {
      return [
        {
          key: "lemma",
          label: term,
          detail: "dans la concordance",
          href: `/concordance?q=${encodeURIComponent(term)}`,
          greek: true,
        },
      ];
    }
    const addition = parseEstherAddition(term);
    const esther = addition && books.find((b) => b.id === "est" && matches(b, norm(addition.bookQuery)));
    if (addition && esther) {
      return [
        {
          key: esther.id,
          label: esther.name,
          detail: placeDetail(addition),
          href: `${esther.routePrefix ?? routePrefix}/${esther.id}/${addition.chapter}${addition.verse ? `#v${addition.verse}` : ""}`,
        },
      ];
    }
    const m = term.match(/^(.+?)\s*(?:(\d+)(?:\s*[:.,]\s*(\d+)?)?)?$/);
    const bookQ = norm(m?.[1] ?? "");
    if (!bookQ) return [];
    const chapter = m?.[2] ? Number(m[2]) : null;
    const verse = m?.[3] ? Number(m[3]) : null;
    return books
      .filter((b) => matches(b, bookQ))
      .sort((a, b) => Number(norm(b.name).startsWith(bookQ)) - Number(norm(a.name).startsWith(bookQ)))
      .slice(0, 6)
      .map((b) => {
        const valid = chapter != null && hasChapter(b, chapter);
        const place = valid && b.id === "est" ? estherPlace(chapter, verse) : { chapter: valid ? chapter : 1, verse: valid ? verse : null };
        const { chapter: ch, verse: v } = place;
        return {
          key: b.id,
          label: b.name,
          detail: v || typeof ch === "string" ? placeDetail(place) : `chapitre ${ch}${b.chapters > 1 ? ` / ${b.chapters}` : ""}`,
          href: `${b.routePrefix ?? routePrefix}/${b.id}/${ch}${v ? `#v${v}` : ""}`,
        };
      });
  }, [books, q, routePrefix]);

  const go = (o: Option | undefined) => {
    if (!o) return;
    setQ("");
    router.push(o.href);
  };

  const show = open && options.length > 0;
  const optionId = (idx: number) => `refjump-opt-${idx}`;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      if (show) {
        e.preventDefault();
        setOpen(false);
      }
      return;
    }
    if (!show) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    }
  };

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        go(options[active] ?? options[0]);
      }}
      className="flex w-full gap-3"
    >
      <div className="relative min-w-0 flex-1">
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 z-10 h-[19px] w-[19px] -translate-y-1/2 text-base-content/70"
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
          id={id}
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label={id ? undefined : "Aller à une référence"}
          role="combobox"
          aria-expanded={show}
          aria-controls="refjump-listbox"
          aria-autocomplete="list"
          aria-activedescendant={show ? optionId(active) : undefined}
          autoComplete="off"
          spellCheck={false}
          className="input input-lg input-bordered w-full rounded-xl bg-base-100 pl-12 text-base text-base-content shadow-sm"
        />
        {show && (
          <ul
            id="refjump-listbox"
            role="listbox"
            aria-label="Références proposées"
            className="absolute z-20 mt-1 w-full overflow-hidden rounded-box border border-base-300 bg-base-100 shadow-lg"
          >
            {options.map((o, idx) => (
              <li key={o.key} role="option" aria-selected={idx === active} id={optionId(idx)}>
                <button
                  type="button"
                  tabIndex={-1}
                  onMouseEnter={() => setActive(idx)}
                  onClick={() => go(o)}
                  className={`flex w-full items-baseline justify-between gap-3 px-3.5 py-2 text-left text-sm text-base-content transition-colors ${
                    idx === active ? "bg-primary/10" : "hover:bg-base-200"
                  }`}
                >
                  <span className={o.greek ? "font-greek text-base" : "font-medium"}>{o.label}</span>
                  <span className="shrink-0 text-xs text-base-content/80">{o.detail}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {submitLabel && (
        <button type="submit" className="btn btn-primary btn-lg rounded-full px-7 max-sm:hidden">
          {submitLabel}
        </button>
      )}
    </form>
  );
}
