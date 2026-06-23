import { useEffect, useMemo, useState } from "react";
import { concordance, lemmaByKey, searchLemmas, type LemmaEntry } from "../lib/concordance";
import { glossFor, type Gloss } from "../data/glosses";

function FullDefinition({ gloss }: { gloss: Gloss }) {
  const [full, setFull] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "done" | "error">("loading");

  useEffect(() => {
    let alive = true;
    setState("loading");
    setFull(null);
    fetch(`https://api.bailly.app/entry/${encodeURIComponent(gloss.uri)}?fields=definition`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => {
        if (!alive) return;
        setFull(d?.data?.entry?.definition ?? null);
        setState("done");
      })
      .catch(() => alive && setState("error"));
    return () => {
      alive = false;
    };
  }, [gloss.uri]);

  const text = full ?? gloss.excerpt;
  return (
    <div className="mt-3 rounded-box bg-base-200 px-4 py-3">
      <div className="text-[0.7rem] font-medium uppercase tracking-wide text-base-content/55">
        Définition · Bailly
      </div>
      <p className="font-greek mt-1.5 leading-relaxed whitespace-pre-wrap text-[0.95rem] text-base-content/85">
        {text}
        {state === "loading" && <span className="text-base-content/45"> … (extrait)</span>}
      </p>
      <a
        className="link mt-2 inline-block text-xs text-base-content/55"
        href={`https://bailly.app/recherche/${encodeURIComponent(gloss.uri)}`}
        target="_blank"
        rel="noreferrer"
      >
        Bailly 2020 (CC BY-NC-ND) ↗
      </a>
    </div>
  );
}

function LemmaRow({ entry }: { entry: LemmaEntry }) {
  return (
    <a
      href={`#/concordance/${encodeURIComponent(entry.lemma)}`}
      className="flex items-center gap-3 rounded-box border border-base-300 bg-base-100 px-3.5 py-2.5 transition-colors hover:border-primary/40"
    >
      <span className="font-greek min-w-0 flex-1 truncate text-xl">{entry.lemma}</span>
      <span className="shrink-0 text-xs text-base-content/55">{entry.nature}</span>
      <span className="badge badge-sm badge-ghost shrink-0">{entry.count}</span>
    </a>
  );
}

function List() {
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchLemmas(query), [query]);
  const total = concordance().length;

  return (
    <div className="pb-4">
      <p className="max-w-prose pt-6 text-[0.95rem] leading-relaxed text-base-content/70">
        Concordance des {total} lemmes du corpus. Cherchez un mot (les formes
        fléchies sont regroupées sous leur forme de dictionnaire).
      </p>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Chercher un lemme ou une forme…"
        className="input input-bordered mt-4 w-full"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
      />

      <p className="mt-3 mb-2 text-sm text-base-content/55">
        {results.length} résultat{results.length > 1 ? "s" : ""}
      </p>

      <div className="grid gap-1.5">
        {results.slice(0, 300).map((e) => (
          <LemmaRow key={e.lemma} entry={e} />
        ))}
      </div>
      {results.length > 300 && (
        <p className="mt-3 text-center text-sm text-base-content/55">
          Affinez la recherche pour voir les {results.length - 300} autres.
        </p>
      )}
    </div>
  );
}

function Detail({ entry }: { entry: LemmaEntry }) {
  return (
    <div className="pb-4 pt-5">
      <a href="#/concordance" className="link link-primary text-sm">
        ← Toute la concordance
      </a>

      <div className="mt-3 flex items-baseline gap-3">
        <h1 className="font-greek text-3xl">{entry.lemma}</h1>
        <span className="text-sm text-base-content/60">{entry.nature}</span>
      </div>

      <p className="mt-1 text-sm text-base-content/60">
        {entry.count} occurrence{entry.count > 1 ? "s" : ""}
        {entry.forms.length > 1 && (
          <span className="font-greek"> · formes : {entry.forms.join(", ")}</span>
        )}
      </p>

      {glossFor(entry.lemma) && <FullDefinition gloss={glossFor(entry.lemma)!} />}

      <div className="mt-4 grid gap-1.5">
        {entry.occurrences.map((o, i) => (
          <a
            key={i}
            href={`#/text/${o.textId}?w=${o.w}`}
            className="flex items-center gap-3 rounded-box border border-base-300 bg-base-100 px-3.5 py-2.5 transition-colors hover:border-primary/40"
          >
            <span className="font-greek min-w-0 flex-1 truncate text-lg">{o.forme}</span>
            <span className="shrink-0 text-sm text-base-content/60">
              {o.reference.replace(/\s*\(.*\)$/, "")}
              {o.verse != null ? `, v. ${o.verse}` : ""}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

export default function ConcordanceView({ lemma }: { lemma: string | null }) {
  if (!lemma) return <List />;
  const entry = lemmaByKey(lemma);
  if (!entry) {
    return (
      <div className="py-20 text-center text-base-content/60">
        <p className="font-greek text-xl">{lemma}</p>
        <p className="mt-2">Lemme introuvable dans le corpus.</p>
        <a href="#/concordance" className="link link-primary mt-3 inline-block">
          Toute la concordance
        </a>
      </div>
    );
  }
  return <Detail entry={entry} />;
}
