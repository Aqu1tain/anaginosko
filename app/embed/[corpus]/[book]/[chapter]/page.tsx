import type { Metadata } from "next";
import { loadChapterFs } from "@/lib/nt-server";
import { CORPORA } from "@/src/data/corpus";
import { chapterHref, verseHref, verseRefLabel, chapterRefLabel } from "@/src/data/refParse";

// Widget d'intégration : rendu autonome d'un passage (grec), encadrable en <iframe>
// par un site tiers. Sans le shell du site (cf. app/shell.tsx). Non indexable :
// c'est un fragment de partage, pas une page canonique (le lecteur reste la source).
export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

const SITE = "https://anaginosko.fr";

// Plage de versets « 16 » ou « 16-18 ». Absente = chapitre entier.
function parseRange(v: string | undefined): { vs: number; ve: number } | null {
  const m = v?.match(/^(\d+)(?:[-–](\d+))?$/);
  if (!m) return null;
  const vs = Number(m[1]);
  return { vs, ve: Math.max(vs, m[2] ? Number(m[2]) : vs) };
}

function Fallback({ note }: { note: string }) {
  return (
    <div className="mx-auto max-w-2xl p-5 text-sm text-base-content/70">
      {note} ·{" "}
      <a href={SITE} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
        anaginosko.fr
      </a>
    </div>
  );
}

export default async function EmbedPage({
  params,
  searchParams,
}: {
  params: Promise<{ corpus: string; book: string; chapter: string }>;
  searchParams: Promise<{ v?: string }>;
}) {
  const { corpus: corpusId, book, chapter: chapterStr } = await params;
  const { v } = await searchParams;
  const corpus = CORPORA.find((c) => c.id === corpusId);
  const chapter = Number(chapterStr);
  if (!corpus || !Number.isInteger(chapter) || chapter < 1) return <Fallback note="Passage introuvable" />;

  let text;
  try {
    text = await loadChapterFs(book, chapter, corpus);
  } catch {
    return <Fallback note="Passage introuvable" />;
  }

  const byVerse: Record<number, string[]> = {};
  for (const m of text.mots ?? []) {
    if (m.verse == null) continue;
    (byVerse[m.verse] ??= []).push(m.grec);
  }
  const range = parseRange(v);
  const numbers = Object.keys(byVerse)
    .map(Number)
    .sort((a, b) => a - b)
    .filter((n) => !range || (n >= range.vs && n <= range.ve));
  if (numbers.length === 0) return <Fallback note="Passage introuvable" />;

  const first = numbers[0];
  const last = numbers[numbers.length - 1];
  const label = range
    ? verseRefLabel(corpusId, book, chapter, first, last)
    : chapterRefLabel(corpusId, book, chapter, "long");
  const href = `${SITE}${range ? verseHref(corpusId, book, chapter, first) : chapterHref(corpusId, book, chapter)}`;

  return (
    <div className="mx-auto max-w-2xl bg-base-100 p-5">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-semibold text-primary hover:underline"
      >
        {label} · {corpus.shortLabel}
      </a>
      <div className="mt-3 font-greek text-lg leading-relaxed text-base-content">
        {numbers.map((n) => (
          <p key={n} className="mt-1">
            <sup className="mr-1 align-super text-xs text-base-content/45">{n}</sup>
            {byVerse[n].join(" ")}
          </p>
        ))}
      </div>
      <a
        href={SITE}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-block text-xs text-base-content/50 hover:text-primary"
      >
        Lire sur Anaginosko →
      </a>
    </div>
  );
}
