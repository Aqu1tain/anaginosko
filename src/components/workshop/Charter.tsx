"use client";

import { useEffect, useState } from "react";
import { corpusById } from "@/src/data/corpus";
import { createRule, deleteRule, fetchRules, updateRule, type Rule, type RuleInput } from "@/src/lib/aiApi";
import type { WorkCorpus } from "@/src/lib/workshopApi";

const EMPTY: RuleInput = { kind: "rule", corpus: null, book: null, lemma: null, text: "", examples: null };

function scope(rule: Rule) {
  const book = rule.book ? corpusById(rule.corpus ?? "lxx").bookNames[rule.book] ?? rule.book : null;
  return [rule.kind === "style" ? "Style" : null, rule.corpus === "nt" ? "NT" : rule.corpus === "lxx" ? "Septante" : null, book].filter(Boolean).join(" · ");
}

function RuleRow({ rule, onChanged }: { rule: Rule; onChanged: () => void }) {
  const [text, setText] = useState(rule.text);
  const [examples, setExamples] = useState(rule.examples ?? "");
  const changed = text !== rule.text || examples !== (rule.examples ?? "");
  const proposed = rule.status === "proposed";
  return (
    <li className={`grid gap-2 py-3 sm:grid-cols-[9rem_minmax(0,1fr)_auto] sm:gap-4 ${proposed ? "rounded-box bg-warning/10 px-3" : ""}`}>
      <div className="text-xs text-base-content/55">
        <span className="font-semibold text-base-content">R{rule.id}</span>
        {rule.lemma && <span className="ml-1.5 font-greek text-sm text-base-content">{rule.lemma}</span>}
        <span className="block">{scope(rule) || "Partout"}</span>
        {proposed && <span className="block text-warning">proposée par {rule.author}</span>}
      </div>
      <div className="space-y-1.5">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={Math.min(4, Math.ceil(text.length / 90) || 1)} className="textarea textarea-bordered textarea-sm w-full" />
        <input value={examples} onChange={(e) => setExamples(e.target.value)} placeholder="Exemples (références)" className="input input-bordered input-xs w-full" />
      </div>
      <div className="flex items-start gap-1 sm:flex-col sm:items-end">
        {changed && (
          <button type="button" className="btn btn-primary btn-xs" onClick={() => updateRule(rule.id, { text, examples: examples || null }).then(onChanged)}>
            Enregistrer
          </button>
        )}
        {proposed && (
          <button type="button" className="btn btn-success btn-xs" onClick={() => updateRule(rule.id, { status: "active", text, examples: examples || null }).then(onChanged)}>
            Valider
          </button>
        )}
        <button
          type="button"
          className="btn btn-ghost btn-xs"
          onClick={() => {
            if (confirm(`Supprimer la règle R${rule.id} ?`)) deleteRule(rule.id).then(onChanged);
          }}
        >
          Supprimer
        </button>
      </div>
    </li>
  );
}

// Charte de traduction : règles et réglages de style que l'assistant applique, et
// que l'équipe garde cohérents dans la durée.
export default function Charter({ corpus }: { corpus: WorkCorpus }) {
  const [rules, setRules] = useState<Rule[] | null>(null);
  const [form, setForm] = useState<RuleInput>({ ...EMPTY, corpus });
  const [error, setError] = useState("");
  const load = () => fetchRules().then(setRules).catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  const set = (patch: Partial<RuleInput>) => setForm((f) => ({ ...f, ...patch }));
  const proposed = (rules ?? []).filter((r) => r.status === "proposed");
  const active = (rules ?? []).filter((r) => r.status === "active");

  return (
    <div className="space-y-6">
      <form
        className="grid gap-3 rounded-box border border-base-300 p-4 sm:grid-cols-[10rem_10rem_minmax(0,1fr)_10rem]"
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          try {
            await createRule({ ...form, lemma: form.lemma?.trim() || null, examples: form.examples?.trim() || null });
            setForm({ ...EMPTY, corpus });
            load();
          } catch (err) {
            setError((err as Error).message);
          }
        }}
      >
        <label className="text-sm">
          <span className="mb-1 block text-xs text-base-content/55">Type</span>
          <select value={form.kind} onChange={(e) => set({ kind: e.target.value as Rule["kind"] })} className="select select-bordered select-sm w-full">
            <option value="rule">Règle</option>
            <option value="style">Style d’un livre</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-base-content/55">Corpus</span>
          <select value={form.corpus ?? ""} onChange={(e) => set({ corpus: (e.target.value || null) as WorkCorpus | null, book: null })} className="select select-bordered select-sm w-full">
            <option value="">Tous</option>
            <option value="nt">Nouveau Testament</option>
            <option value="lxx">Septante</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-base-content/55">Livre</span>
          <select value={form.book ?? ""} onChange={(e) => set({ book: e.target.value || null })} disabled={!form.corpus} className="select select-bordered select-sm w-full">
            <option value="">Tous les livres</option>
            {form.corpus &&
              corpusById(form.corpus).bookOrder.map((b) => (
                <option key={b} value={b}>
                  {corpusById(form.corpus!).bookNames[b] ?? b}
                </option>
              ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-base-content/55">Lemme</span>
          <input value={form.lemma ?? ""} onChange={(e) => set({ lemma: e.target.value })} disabled={form.kind === "style"} className="input input-bordered input-sm w-full font-greek" placeholder="καί" />
        </label>
        <label className="text-sm sm:col-span-3">
          <span className="mb-1 block text-xs text-base-content/55">Règle</span>
          <textarea
            value={form.text}
            onChange={(e) => set({ text: e.target.value })}
            rows={2}
            className="textarea textarea-bordered textarea-sm w-full"
            placeholder={form.kind === "style" ? "Psaumes : on peut s’éloigner un peu du mot à mot pour garder le rythme." : "καί narratif en tête de verset : « Et », sauf s’il introduit une subordonnée."}
          />
        </label>
        <div className="flex flex-col justify-end gap-2 text-sm">
          <input value={form.examples ?? ""} onChange={(e) => set({ examples: e.target.value })} className="input input-bordered input-sm w-full" placeholder="Exemples : Gn 1,3" />
          <button className="btn btn-primary btn-sm" disabled={form.text.trim().length < 3 || (form.kind === "style" && !form.book)}>
            Ajouter
          </button>
        </div>
      </form>
      {error && <p className="text-sm text-error">{error}</p>}

      {rules === null ? (
        <p className="text-sm text-base-content/50">Chargement…</p>
      ) : (
        <>
          {proposed.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-semibold">À valider ({proposed.length})</h2>
              <ul className="space-y-2">
                {proposed.map((r) => (
                  <RuleRow key={`${r.id}:${r.updatedAt}`} rule={r} onChanged={load} />
                ))}
              </ul>
            </section>
          )}
          <section>
            <h2 className="mb-1 text-sm font-semibold">Règles en vigueur ({active.length})</h2>
            {active.length ? (
              <ul className="divide-y divide-base-300">
                {active.map((r) => (
                  <RuleRow key={`${r.id}:${r.updatedAt}`} rule={r} onChanged={load} />
                ))}
              </ul>
            ) : (
              <p className="rounded-box border border-dashed border-base-300 px-4 py-8 text-center text-sm text-base-content/55">
                Aucune règle.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
