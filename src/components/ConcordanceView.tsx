"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Breadcrumb from "../../app/_components/Breadcrumb";
import DistributionProfile from "./DistributionProfile";
import {
  loadLemmaIndex,
  loadOccurrences,
  searchLemmaIndex,
  lemmaEntry,
  BOOK_NAMES,
  type LemmaEntry,
  type Occ,
} from "../data/nt";
import { glossFor } from "../data/glosses";

function Loading() {
  return (
    <div className="flex justify-center py-20">
      <span className="loading loading-spinner loading-lg text-primary" />
    </div>
  );
}

function useLemmaIndex() {
  const [index, setIndex] = useState<LemmaEntry[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let alive = true;
    loadLemmaIndex()
      .then((i) => alive && setIndex(i))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, []);
  return { index, error };
}

// Met en forme la notation Bailly : « || » sépare les grands sens, on met en
// gras la vedette et les repères (A, I, 1…).
function formatDefinition(text: string): React.ReactNode {
  const segments = text.split(/\s*\|\|\s*/).map((s) => s.trim()).filter(Boolean);
  return segments.map((seg, i) => {
    if (i === 0) {
      const close = seg.indexOf(")");
      if (close !== -1) {
        return (
          <p key={i} className="font-greek text-[0.95rem] leading-relaxed text-base-content/85">
            <strong className="font-semibold">{seg.slice(0, close + 1)}</strong>
            {seg.slice(close + 1)}
          </p>
        );
      }
    }
    const m = seg.match(/^([A-D]|[IVX]{1,4}|\d+)(\b.*)$/s);
    return (
      <p key={i} className="font-greek text-[0.95rem] leading-relaxed text-base-content/85">
        {m ? <><strong className="text-accent">{m[1]}</strong>{m[2]}</> : seg}
      </p>
    );
  });
}

// Définition Bailly : excerpt bundlé en repli instantané, puis définition
// complète récupérée en direct par lemme (lookup -> entry).
function Definition({ lemma }: { lemma: string }) {
  const bundled = glossFor(lemma);
  const [text, setText] = useState<string | null>(bundled?.excerpt ?? null);
  const [uri, setUri] = useState<string | null>(bundled?.uri ?? null);
  const [state, setState] = useState<"loading" | "done" | "absent">("loading");

  useEffect(() => {
    let alive = true;
    setState("loading");
    (async () => {
      try {
        const look = await fetch(`https://api.bailly.app/lookup/${encodeURIComponent(lemma)}`).then((r) => r.json());
        const entry = (look?.data?.entries ?? []).find((e: { isMorpheus?: boolean }) => !e.isMorpheus) ?? look?.data?.entries?.[0];
        if (!entry) { if (alive) setState(text ? "done" : "absent"); return; }
        const full = await fetch(`https://api.bailly.app/entry/${encodeURIComponent(entry.uri)}?fields=definition`).then((r) => r.json());
        if (!alive) return;
        setText(full?.data?.entry?.definition ?? entry.excerpt ?? text);
        setUri(entry.uri);
        setState("done");
      } catch {
        if (alive) setState(text ? "done" : "absent");
      }
    })();
    return () => { alive = false; };
  }, [lemma]); // eslint-disable-line react-hooks/exhaustive-deps

  if (state === "absent" && !text) return null;
  return (
    <div className="mt-3 rounded-box bg-base-200 px-4 py-3">
      <div className="text-[0.7rem] font-medium uppercase tracking-wide text-base-content/70">
        Définition · Bailly
      </div>
      {text ? (
        <div className="mt-1.5 space-y-1.5">{formatDefinition(text)}</div>
      ) : (
        <p className="mt-1 text-sm text-base-content/70">Recherche…</p>
      )}
      {state === "loading" && text && (
        <p className="mt-1 text-xs text-base-content/70">… définition complète en cours</p>
      )}
      {uri && (
        <a
          className="link mt-2 inline-block text-xs text-base-content/70"
          href={`https://bailly.app/${encodeURIComponent(lemma)}`}
          target="_blank"
          rel="noreferrer"
        >
          Bailly 2020 (CC BY-NC-ND) ↗
        </a>
      )}
    </div>
  );
}

function LemmaRow({ entry }: { entry: LemmaEntry }) {
  return (
    <Link
      href={`/concordance/${encodeURIComponent(entry.lemma)}`}
      className="flex items-center gap-3 rounded-box border border-base-300 bg-base-100 px-3.5 py-2.5 transition-colors hover:border-primary/40"
    >
      <span className="min-w-0 flex-1">
        <span className="font-greek text-xl">{entry.lemma}</span>
        <span className="ml-2 text-sm text-base-content/70">{entry.translitR}</span>
        <span className="ml-1.5 text-xs text-base-content/70">· {entry.translit}</span>
      </span>
      <span className="shrink-0 text-xs text-base-content/70">{entry.nature}</span>
      <span className="badge badge-sm badge-ghost shrink-0">{entry.count}</span>
    </Link>
  );
}

const EXAMPLE_LEMMAS = ["λόγος", "ἀγάπη", "θεός", "πίστις", "χάρις", "πνεῦμα"];

function List({ index }: { index: LemmaEntry[] }) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchLemmaIndex(index, query), [index, query]);
  const examples = useMemo(() => {
    const byLemma = new Map(index.map((e) => [e.lemma, e]));
    return EXAMPLE_LEMMAS.map((l) => byLemma.get(l)).filter((e): e is LemmaEntry => !!e);
  }, [index]);

  return (
    <div className="pb-4">
      <p className="max-w-prose pt-6 text-[0.95rem] leading-relaxed text-base-content/75">
        Concordance des {index.length} lemmes du Nouveau Testament. Cherchez en grec
        (<span className="font-greek">λόγος</span>) ou en translittération latine, restituée
        comme érasmienne (ex.&nbsp;<span className="font-greek">ἀρχή</span> : <em>arkhi</em> ou{" "}
        <em>arkê</em>).
      </p>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Chercher : λόγος, arkhi, logos…"
        className="input input-bordered mt-4 w-full"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
      />
      {!query && examples.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-base-content/70">
            Exemples
          </span>
          {examples.map((e) => (
            <Link
              key={e.lemma}
              href={`/concordance/${encodeURIComponent(e.lemma)}`}
              className="badge badge-lg badge-ghost gap-1.5 font-greek hover:badge-primary"
            >
              {e.lemma}
              <span className="text-[0.65rem] text-base-content/70">{e.count}</span>
            </Link>
          ))}
        </div>
      )}
      <p className="mt-3 mb-2 text-sm text-base-content/70">
        {results.length} résultat{results.length > 1 ? "s" : ""}
      </p>
      {results.length === 0 ? (
        <div className="rounded-box bg-base-200 px-4 py-6 text-center text-sm text-base-content/70">
          Aucun résultat. Essaie en grec ou en translittération latine.
        </div>
      ) : (
        <div className="grid gap-1.5">
          {results.slice(0, 300).map((e) => (
            <LemmaRow key={e.lemma} entry={e} />
          ))}
        </div>
      )}
      {results.length > 300 && (
        <p className="mt-3 text-center text-sm text-base-content/70">
          Affinez la recherche pour voir les {results.length - 300} autres.
        </p>
      )}
    </div>
  );
}

function Occurrences({ entry }: { entry: LemmaEntry }) {
  const [occ, setOcc] = useState<Occ[] | null>(null);
  useEffect(() => {
    let alive = true;
    setOcc(null);
    loadOccurrences(entry.oid).then((o) => alive && setOcc(o));
    return () => { alive = false; };
  }, [entry.oid]);

  if (!occ) return <Loading />;
  return (
    <div className="mt-4 grid gap-1.5">
      {entry.count > occ.length && (
        <p className="text-sm text-base-content/70">
          {occ.length} premières occurrences sur {entry.count}.
        </p>
      )}
      {occ.map((o, i) => (
        <Link
          key={i}
          href={`/nt/${o.b}/${o.c}?w=${o.w}`}
          className="flex items-center gap-3 rounded-box border border-base-300 bg-base-100 px-3.5 py-2.5 transition-colors hover:border-primary/40"
        >
          <span className="font-greek min-w-0 flex-1 truncate text-lg">{o.f}</span>
          <span className="shrink-0 text-sm text-base-content/70">
            {BOOK_NAMES[o.b] ?? o.b} {o.c}:{o.v}
          </span>
        </Link>
      ))}
    </div>
  );
}

function Detail({ entry }: { entry: LemmaEntry }) {
  return (
    <div className="pb-4">
      <Breadcrumb
        items={[
          { label: "Accueil", href: "/", home: true },
          { label: "Concordance", href: "/concordance" },
          { label: entry.lemma, greek: true },
        ]}
      />
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="font-greek text-3xl">{entry.lemma}</h1>
        <span className="text-sm text-base-content/70">{entry.translitR}</span>
        <span className="text-xs text-base-content/70">érasmien&nbsp;: {entry.translit}</span>
        <span className="text-sm text-base-content/70">· {entry.nature}</span>
      </div>
      <p className="mt-1 text-sm text-base-content/70">
        {entry.count} occurrence{entry.count > 1 ? "s" : ""} dans le NT
      </p>
      <Definition lemma={entry.lemma} />
      <DistributionProfile entry={entry} />
      <Occurrences entry={entry} />
    </div>
  );
}

export default function ConcordanceView({ lemma }: { lemma: string | null }) {
  const { index, error } = useLemmaIndex();
  if (error) return <p className="py-20 text-center text-base-content/70">Chargement impossible.</p>;
  if (!index) return <Loading />;

  if (!lemma) return <List index={index} />;
  const entry = lemmaEntry(index, lemma);
  if (!entry) {
    return (
      <div className="py-20 text-center text-base-content/70">
        <p className="font-greek text-xl">{lemma}</p>
        <p className="mt-2">Lemme introuvable.</p>
        <Link href="/concordance" className="link link-primary mt-3 inline-block">
          Toute la concordance
        </Link>
      </div>
    );
  }
  return <Detail entry={entry} />;
}
