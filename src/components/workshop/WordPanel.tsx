"use client";

import { useEffect, useState } from "react";
import type { Mot } from "@/src/data/texts";
import type { KwicPage } from "@/lib/kwic";
import { corpusById } from "@/src/data/corpus";
import { saveTerm, type KeyTerm, type WorkCorpus } from "@/src/lib/workshopApi";
import { hasRendering } from "./checks";

type PublishedMap = Record<string, Record<string, { maison: string }>>;

// Mot sélectionné : analyse, rendus admis (glossaire) et comment le lemme est déjà
// traduit ailleurs dans le corpus, pour garder la traduction cohérente.
export default function WordPanel({
  corpus,
  mot,
  term,
  published,
  onTermSaved,
}: {
  corpus: WorkCorpus;
  mot: Mot;
  term: KeyTerm | undefined;
  published: PublishedMap;
  onTermSaved: () => void;
}) {
  const lemma = mot.lemme ?? "";
  const [renderings, setRenderings] = useState<string[]>(term?.renderings ?? []);
  const [note, setNote] = useState(term?.note ?? "");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [elsewhere, setElsewhere] = useState<KwicPage | null>(null);

  useEffect(() => {
    if (!lemma) return;
    let alive = true;
    setElsewhere(null);
    fetch(`/concordance/api/kwic/${corpus}/${encodeURIComponent(lemma)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => alive && setElsewhere(p))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [corpus, lemma]);

  const changed = JSON.stringify(renderings) !== JSON.stringify(term?.renderings ?? []) || note !== (term?.note ?? "");
  const save = async () => {
    setBusy(true);
    await saveTerm(lemma, renderings, note || undefined).catch(() => {});
    setBusy(false);
    onTermSaved();
  };
  const add = () => {
    const v = input.trim();
    if (v && !renderings.includes(v)) setRenderings([...renderings, v]);
    setInput("");
  };
  const names = corpusById(corpus).bookNames;

  return (
    <div className="space-y-5">
      <header>
        <p lang="grc" className="font-greek text-2xl">
          {mot.grec}
        </p>
        <p className="mt-1 text-sm">
          <a href={`${corpusById(corpus).concordanceBase}/${encodeURIComponent(lemma)}`} target="_blank" rel="noreferrer" lang="grc" className="font-greek link">
            {lemma}
          </a>
          <span className="text-base-content/70">
            {" "}
            · {mot.nature?.toLowerCase()}
            {mot.morph ? ` · ${mot.morph}` : ""}
          </span>
        </p>
      </header>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-base-content/70">Rendus admis</h3>
        <div className="flex flex-wrap gap-1.5">
          {renderings.map((r) => (
            <span key={r} className="inline-flex items-center gap-1 rounded-md bg-base-200 py-1 pl-2 pr-1.5 text-sm">
              {r}
              <button type="button" aria-label={`Retirer ${r}`} onClick={() => setRenderings(renderings.filter((x) => x !== r))} className="text-base-content/70 hover:text-base-content">
                ×
              </button>
            </span>
          ))}
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            onBlur={add}
            placeholder="Ajouter (amour, amour*)"
            className="input input-bordered input-xs w-40"
          />
        </div>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Note de traduction" className="textarea textarea-bordered mt-2 w-full text-sm" />
        {changed && (
          <button type="button" onClick={save} disabled={busy} className="btn btn-primary btn-xs mt-1">
            {busy ? "…" : "Enregistrer le terme"}
          </button>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-base-content/70">
          Ailleurs{elsewhere ? ` · ${elsewhere.total} occurrences` : ""}
        </h3>
        {!elsewhere ? (
          <p className="text-sm text-base-content/70">Chargement…</p>
        ) : (
          <ul className="space-y-2.5">
            {elsewhere.lines.slice(0, 25).map((l) => {
              const fr = published[l.b]?.[`${l.c}:${l.v}`]?.maison;
              const consistent = fr && renderings.length ? renderings.some((r) => hasRendering(fr, r)) : null;
              return (
                <li key={`${l.b}${l.c}${l.w}`} className="text-sm">
                  <a href={`?corpus=${corpus}&book=${l.b}&ch=${l.c}#v${l.v}`} className="text-xs font-medium text-primary hover:underline">
                    {names[l.b] ?? l.b} {l.c}:{l.v}
                  </a>
                  <p lang="grc" className="font-greek text-[0.95rem] text-base-content/80">
                    {l.left} <strong className="text-base-content">{l.form}</strong> {l.right}
                  </p>
                  {fr ? (
                    <p className={`text-[0.85rem] ${consistent === false ? "text-warning-content" : "text-base-content"}`}>{fr}</p>
                  ) : (
                    <p className="text-xs text-base-content/70">Non traduit</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
