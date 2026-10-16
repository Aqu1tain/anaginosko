"use client";

import { useEffect, useState } from "react";
import { fetchTerms, saveTerm, type KeyTerm } from "@/src/lib/workshopApi";

const split = (v: string) => v.split(",").map((s) => s.trim()).filter(Boolean);

function TermRow({ term, onSaved }: { term: KeyTerm; onSaved: () => void }) {
  const [renderings, setRenderings] = useState(term.renderings.join(", "));
  const [note, setNote] = useState(term.note ?? "");
  const changed = renderings !== term.renderings.join(", ") || note !== (term.note ?? "");
  return (
    <tr className="align-top">
      <td lang="grc" className="py-2 pr-4 font-greek text-lg">
        {term.lemma}
      </td>
      <td className="py-2 pr-4">
        <input value={renderings} onChange={(e) => setRenderings(e.target.value)} className="input input-bordered input-sm w-full" />
      </td>
      <td className="py-2 pr-4">
        <input value={note} onChange={(e) => setNote(e.target.value)} className="input input-bordered input-sm w-full" placeholder="Note" />
      </td>
      <td className="py-2 text-right text-xs text-base-content/45">
        {changed ? (
          <button type="button" className="btn btn-primary btn-xs" onClick={() => saveTerm(term.lemma, split(renderings), note || undefined).then(onSaved)}>
            Enregistrer
          </button>
        ) : (
          term.by
        )}
      </td>
    </tr>
  );
}

// Glossaire des termes clés : un lemme, ses rendus admis (séparés par des virgules,
// « * » pour un début de mot) et une note. Vider les rendus retire le terme.
export default function Glossary() {
  const [terms, setTerms] = useState<KeyTerm[] | null>(null);
  const [lemma, setLemma] = useState("");
  const [renderings, setRenderings] = useState("");
  const [q, setQ] = useState("");
  const load = () => fetchTerms().then(setTerms).catch(() => setTerms([]));
  useEffect(() => {
    load();
  }, []);

  const shown = (terms ?? []).filter((t) => !q || t.lemma.includes(q) || t.renderings.some((r) => r.includes(q)));

  return (
    <div className="space-y-4">
      <form
        className="flex flex-wrap items-end gap-2 rounded-box border border-base-300 p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!lemma.trim() || !split(renderings).length) return;
          await saveTerm(lemma.trim(), split(renderings));
          setLemma("");
          setRenderings("");
          load();
        }}
      >
        <label className="text-sm">
          <span className="mb-1 block text-xs text-base-content/55">Lemme</span>
          <input value={lemma} onChange={(e) => setLemma(e.target.value)} className="input input-bordered input-sm w-40 font-greek" placeholder="ἀγάπη" />
        </label>
        <label className="min-w-48 flex-1 text-sm">
          <span className="mb-1 block text-xs text-base-content/55">Rendus admis</span>
          <input value={renderings} onChange={(e) => setRenderings(e.target.value)} className="input input-bordered input-sm w-full" placeholder="amour, charité" />
        </label>
        <button className="btn btn-primary btn-sm">Ajouter</button>
      </form>
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher un terme" className="input input-bordered input-sm w-full max-w-xs" />
      {terms === null ? (
        <p className="text-sm text-base-content/50">Chargement…</p>
      ) : shown.length ? (
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-base-content/50">
            <tr>
              <th className="pb-2 font-medium">Lemme</th>
              <th className="pb-2 font-medium">Rendus admis</th>
              <th className="pb-2 font-medium">Note</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-base-300/70">
            {shown.map((t) => (
              <TermRow key={`${t.lemma}:${t.renderings.join()}:${t.note}`} term={t} onSaved={load} />
            ))}
          </tbody>
        </table>
      ) : (
        <p className="rounded-box border border-dashed border-base-300 px-4 py-8 text-center text-sm text-base-content/55">Aucun terme. Ajoutez-en ici ou depuis un mot grec de l’éditeur.</p>
      )}
    </div>
  );
}
