"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { corpusById } from "@/src/data/corpus";
import { fetchCorpusDrafts, fetchPublished, saveDrafts, type WorkCorpus } from "@/src/lib/workshopApi";

type Verse = { book: string; ref: string; text: string; draft: boolean };

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

function pattern(q: string, caseSensitive: boolean, whole: boolean): RegExp | null {
  if (!q) return null;
  const body = escape(q);
  return new RegExp(whole ? `(?<![\\p{L}\\p{N}])${body}(?![\\p{L}\\p{N}])` : body, `gu${caseSensitive ? "" : "i"}`);
}

function Highlight({ text, re }: { text: string; re: RegExp }) {
  const parts: (string | { hit: string })[] = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    parts.push(text.slice(last, m.index), { hit: m[0] });
    last = m.index! + m[0].length;
  }
  parts.push(text.slice(last));
  return (
    <>
      {parts.map((p, i) => (typeof p === "string" ? <Fragment key={i}>{p}</Fragment> : <mark key={i} className="rounded bg-warning/40 px-0.5">{p.hit}</mark>))}
    </>
  );
}

// Recherche dans la traduction maison (publiée ou en cours) et remplacement en lot.
// Un remplacement crée des versions de travail : rien n'est publié sans relecture.
export default function SearchReplace({ corpus }: { corpus: WorkCorpus }) {
  const [verses, setVerses] = useState<Verse[] | null>(null);
  const [q, setQ] = useState("");
  const [by, setBy] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [whole, setWhole] = useState(false);
  const [accents, setAccents] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const names = corpusById(corpus).bookNames;

  const load = () =>
    Promise.all([fetchPublished(corpus), fetchCorpusDrafts(corpus)]).then(([pub, drafts]) => {
      const map = new Map<string, Verse>();
      for (const [book, refs] of Object.entries(pub)) for (const [ref, e] of Object.entries(refs)) map.set(`${book} ${ref}`, { book, ref, text: e.maison, draft: false });
      for (const d of drafts) if (d.text) map.set(`${d.book} ${d.ref}`, { book: d.book, ref: d.ref, text: d.text, draft: true });
      setVerses([...map.values()]);
    });
  useEffect(() => {
    setVerses(null);
    load().catch(() => setVerses([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [corpus]);

  const re = pattern(accents ? q : fold(q), caseSensitive, whole);
  const hits = useMemo(() => {
    if (!re || !verses) return [];
    return verses.filter((v) => (accents ? v.text : fold(v.text)).search(new RegExp(re.source, re.flags.replace("g", ""))) >= 0);
  }, [verses, re, accents]);

  const replaceAll = async () => {
    if (!re || !accents) return;
    setBusy(true);
    const byBook = new Map<string, { ref: string; text: string }[]>();
    for (const v of hits) {
      const text = v.text.replace(re, by);
      if (text !== v.text) (byBook.get(v.book) ?? byBook.set(v.book, []).get(v.book)!).push({ ref: v.ref, text });
    }
    let saved = 0;
    for (const [book, changes] of byBook) for (let i = 0; i < changes.length; i += 500) saved += (await saveDrafts(corpus, book, changes.slice(i, i + 500))).saved;
    setNotice(`${saved} brouillon${saved > 1 ? "s" : ""} créé${saved > 1 ? "s" : ""}.`);
    setBusy(false);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-box border border-base-300 p-4 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-xs text-base-content/80">Rechercher</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} className="input input-bordered input-sm w-full" placeholder="charité" autoFocus />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-base-content/80">Remplacer par</span>
          <input value={by} onChange={(e) => setBy(e.target.value)} className="input input-bordered input-sm w-full" placeholder="amour" disabled={!accents} />
        </label>
        <div className="flex flex-wrap gap-4 text-sm sm:col-span-2">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="checkbox checkbox-xs" checked={caseSensitive} onChange={(e) => setCaseSensitive(e.target.checked)} />
            Respecter la casse
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="checkbox checkbox-xs" checked={whole} onChange={(e) => setWhole(e.target.checked)} />
            Mot entier
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="checkbox checkbox-xs" checked={!accents} onChange={(e) => setAccents(!e.target.checked)} />
            Ignorer les accents (recherche seule)
          </label>
          {q && accents && hits.length > 0 && (
            <button type="button" disabled={busy} onClick={replaceAll} className="btn btn-primary btn-xs ml-auto">
              {busy ? "…" : `Remplacer ${hits.length} verset${hits.length > 1 ? "s" : ""}`}
            </button>
          )}
        </div>
      </div>
      {notice && <p className="text-sm text-success">{notice}</p>}
      {!verses ? (
        <p className="text-sm text-base-content/70">Chargement…</p>
      ) : !q ? (
        <p className="text-sm text-base-content/70">{verses.length.toLocaleString("fr-FR")} versets traduits.</p>
      ) : (
        <>
          <p className="text-sm text-base-content/70">
            {hits.length} verset{hits.length > 1 ? "s" : ""}
          </p>
          <ul className="divide-y divide-base-300 rounded-box border border-base-300">
            {hits.slice(0, 300).map((v) => {
              const [ch, n] = v.ref.split(":");
              const shown = accents ? v.text : fold(v.text);
              return (
                <li key={`${v.book}${v.ref}`}>
                  <Link href={`?corpus=${corpus}&book=${v.book}&ch=${ch}#v${n}`} className="grid gap-1 px-4 py-2.5 hover:bg-base-200/50 sm:grid-cols-[9rem_minmax(0,1fr)]">
                    <span className="text-sm font-medium">
                      {names[v.book] ?? v.book} {v.ref}
                      {v.draft && <span className="block text-xs font-normal text-base-content/70">brouillon</span>}
                    </span>
                    <span className="min-w-0 text-sm">
                      <Highlight text={shown} re={re!} />
                      {by && accents && <span className="mt-0.5 block text-base-content/80">→ {v.text.replace(re!, by)}</span>}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
