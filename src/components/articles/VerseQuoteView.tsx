import Link from "next/link";
import { corpusById } from "@/src/data/corpus";
import { verseHref, verseRefLabel } from "@/src/data/refParse";
import type { VerseLine } from "./citationTypes";

// Affichage d'une citation biblique, partagé entre l'éditeur (aperçu client) et le
// rendu public (serveur). Purement présentationnel : les versets résolus arrivent en
// props. `linked` à false dans l'éditeur (pas de navigation pendant l'édition).
export default function VerseQuoteView({
  corpus,
  book,
  chapter,
  verseStart,
  verseEnd,
  showFrench,
  verses,
  linked = true,
}: {
  corpus: string;
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  showFrench: boolean;
  verses: VerseLine[] | null;
  linked?: boolean;
}) {
  const href = verseHref(corpus, book, chapter, verseStart);
  const label = verseRefLabel(corpus, book, chapter, verseStart, verseEnd);
  const shortLabel = corpusById(corpus).shortLabel;
  const french = showFrench ? (verses ?? []).filter((v) => v.french) : [];

  const figure = (
    <figure className="my-1 rounded-r-lg border-l-4 border-primary bg-base-200/50 px-4 py-3">
      <div className="font-greek text-lg leading-relaxed text-base-content">
        {verses === null ? (
          <span className="text-base-content/40">Chargement…</span>
        ) : verses.length === 0 ? (
          <span className="text-base-content/60">{label}</span>
        ) : (
          verses.map((v) => (
            <span key={v.v}>
              <sup className="mr-0.5 select-none text-[0.6em] text-base-content/45">{v.v}</sup>
              {v.greek}{" "}
            </span>
          ))
        )}
      </div>
      {french.length > 0 && (
        <div className="mt-2 space-y-1 text-sm text-base-content/75">
          {french.map((v) => (
            <p key={v.v}>{v.french}</p>
          ))}
        </div>
      )}
      <figcaption className="mt-2 text-xs font-medium uppercase tracking-wide text-primary/80">
        {label} · {shortLabel}
      </figcaption>
    </figure>
  );

  if (!linked) return <div className="block">{figure}</div>;
  return (
    <Link href={href} className="block no-underline transition-colors hover:bg-base-200/80">
      {figure}
    </Link>
  );
}
