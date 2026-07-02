import Link from "next/link";
import { loadLemmasFs } from "@/lib/nt-server";
import type { CorpusConfig } from "@/src/data/corpus";

// Index A-Z des lemmes, rendu serveur : la concordance interactive est un
// composant client, ses milliers de fiches étaient donc invisibles des moteurs
// (pages orphelines). Cet index les relie en HTML, groupées par initiale.
const initialOf = (lemma: string) =>
  lemma.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase()[0] ?? "·";

export default async function LemmaIndex({ corpus }: { corpus: CorpusConfig }) {
  const lemmas = await loadLemmasFs(corpus);
  const groups = new Map<string, string[]>();
  for (const e of lemmas) {
    const k = initialOf(e.lemma);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(e.lemma);
  }
  const letters = [...groups.keys()].sort((a, b) => a.localeCompare(b, "el"));

  return (
    <section className="mt-10 border-t border-base-300 pt-6 pb-6">
      <h2 className="text-lg font-bold">Tous les lemmes, d’alpha à oméga</h2>
      <p className="mt-1 text-sm text-base-content/70">
        Les {lemmas.length.toLocaleString("fr-FR")} lemmes {corpus.genitive}, chacun avec sa
        définition, ses occurrences et sa répartition.
      </p>
      <div className="mt-3 grid gap-1.5">
        {letters.map((L) => (
          <details key={L} className="collapse collapse-arrow border border-base-300 bg-base-100">
            <summary className="collapse-title font-greek min-h-0 py-2.5 text-lg font-medium">
              {L} <span className="font-sans text-sm text-base-content/60">· {groups.get(L)!.length}</span>
            </summary>
            <div className="collapse-content">
              <div className="flex flex-wrap gap-x-3 gap-y-1.5 pb-2">
                {groups.get(L)!.map((l) => (
                  <Link
                    key={l}
                    href={`${corpus.concordanceBase}/${encodeURIComponent(l)}`}
                    className="font-greek text-[0.95rem] text-base-content/80 underline-offset-2 hover:text-primary hover:underline"
                  >
                    {l}
                  </Link>
                ))}
              </div>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
