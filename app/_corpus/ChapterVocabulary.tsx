import Link from "next/link";
import { loadLemmasFs } from "@/lib/nt-server";
import type { CorpusConfig } from "@/src/data/corpus";
import type { Text } from "@/src/data/texts";

// Vocabulaire du chapitre, replié sous le texte : chaque lemme renvoie à sa fiche de
// concordance. Liste d'étude pour le lecteur, et seuls liens rendus serveur d'un
// chapitre vers les fiches (les mots du lecteur sont des boutons).
export default async function ChapterVocabulary({ text, corpus, label }: { text: Text; corpus: CorpusConfig; label: string }) {
  const index = new Map((await loadLemmasFs(corpus)).map((e) => [e.lemma, e]));
  const here = new Map<string, number>();
  for (const m of text.mots ?? []) {
    if (m.lemme && index.has(m.lemme)) here.set(m.lemme, (here.get(m.lemme) ?? 0) + 1);
  }
  if (!here.size) return null;
  const words = [...here].sort(([a], [b]) => a.localeCompare(b, "el"));

  return (
    <details className="reading-col group mt-10 rounded-box border border-base-300 bg-base-100">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-semibold">
        <span>
          Vocabulaire de {label}{" "}
          <span className="font-normal text-base-content/60">({words.length} mots)</span>
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="transition-transform group-open:rotate-180">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <ul className="grid gap-x-6 border-t border-base-300 px-4 py-3 sm:grid-cols-2">
        {words.map(([lemma, n]) => {
          const entry = index.get(lemma)!;
          return (
            <li key={lemma} className="flex items-baseline justify-between gap-3 border-b border-base-300/60 py-1.5 last:border-0">
              <Link href={`${corpus.concordanceBase}/${encodeURIComponent(lemma)}`} lang="grc" className="font-greek text-lg hover:text-primary">
                {lemma}
              </Link>
              <span className="shrink-0 text-xs text-base-content/60">
                {entry.nature.toLowerCase()} · {n} ici, {entry.count.toLocaleString("fr-FR")} en tout
              </span>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
