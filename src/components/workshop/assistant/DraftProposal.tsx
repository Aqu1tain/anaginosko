"use client";

import { useState } from "react";
import { LEVEL_LABEL, type Proposal, type Step } from "@/src/lib/aiApi";

export const STEPS: [Step, string][] = [
  ["dossier", "Dossier du verset"],
  ["analyse", "Analyse du grec"],
  ["jet", "Premier jet"],
  ["couverture", "Couverture mot à mot"],
  ["relecture", "Relecture critique"],
  ["correction", "Correction"],
];

export type StepState = Partial<Record<Step, { status: "start" | "done"; detail?: string }>>;

export function Progress({ steps }: { steps: StepState }) {
  return (
    <ol className="space-y-1.5 text-sm">
      {STEPS.filter(([k]) => k !== "correction" || steps[k]).map(([k, label]) => {
        const s = steps[k];
        return (
          <li key={k} className={`flex items-center gap-2 ${s ? "" : "text-base-content/40"}`}>
            <span className="w-4 text-center">{s?.status === "done" ? "✓" : s ? <span className="loading loading-spinner loading-xs" /> : "·"}</span>
            {label}
            {s?.detail && <span className="text-xs text-warning">{s.detail}</span>}
          </li>
        );
      })}
    </ol>
  );
}

const levelTone: Record<string, string> = {
  lexical: "badge-info",
  exegetical: "badge-warning",
  theological: "badge-secondary",
  style: "badge-ghost",
};

function Section({ title, children, open = false }: { title: string; children: React.ReactNode; open?: boolean }) {
  const [shown, setShown] = useState(open);
  return (
    <section className="border-t border-base-300 pt-3">
      <button type="button" onClick={() => setShown(!shown)} className="flex w-full items-center justify-between text-left text-xs font-semibold uppercase tracking-wider text-base-content/50">
        {title}
        <span aria-hidden>{shown ? "−" : "+"}</span>
      </button>
      {shown && <div className="mt-2">{children}</div>}
    </section>
  );
}

// Proposition de l'assistant pour un verset : jet, décisions motivées, relecture,
// analyse et alignement mot à mot.
export default function DraftProposal({ proposal, current, onUse }: { proposal: Proposal; current: string; onUse: (text: string) => void }) {
  const { draft, review, analysis, words } = proposal;
  const majors = review.issues.filter((i) => i.severity === "major");
  const greek = (ids: number[]) => ids.map((i) => words[i]?.grec).filter(Boolean).join(" ");
  const segments = [
    ...draft.alignment.map((a) => ({ at: Math.min(...a.words), greek: greek(a.words), french: a.french, tone: "" })),
    ...draft.omitted.map((o) => ({ at: o.i, greek: greek([o.i]), french: `(${o.reason})`, tone: "text-base-content/45" })),
    ...proposal.missing.map((i) => ({ at: i, greek: greek([i]), french: "non traité", tone: "text-error" })),
  ].sort((a, b) => a.at - b.at);
  const same = current.trim() === draft.translation.trim();

  return (
    <div className="space-y-3">
      <div className="rounded-box bg-base-200/70 p-3">
        <p className="text-[0.95rem] leading-relaxed">{draft.translation}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" className="btn btn-primary btn-sm" disabled={same} onClick={() => onUse(draft.translation)}>
            {same ? "Dans l’éditeur" : current.trim() ? "Remplacer" : "Utiliser"}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigator.clipboard?.writeText(draft.translation)}>
            Copier
          </button>
          {proposal.revised && <span className="text-xs text-base-content/55">corrigé après relecture</span>}
        </div>
      </div>

      {(majors.length > 0 || proposal.missing.length > 0) && (
        <ul className="space-y-1 text-sm text-error">
          {proposal.missing.length > 0 && <li>Mots non traités : {proposal.missing.map((i) => words[i]?.grec).join(", ")}</li>}
          {majors.map((i, k) => (
            <li key={k}>{i.message}</li>
          ))}
        </ul>
      )}

      {draft.decisions.length > 0 && (
        <ul className="space-y-2.5 text-sm">
          {draft.decisions.map((d, k) => (
            <li key={k}>
              <p>
                <span className="font-greek">{d.about}</span> → <strong>{d.choice}</strong>{" "}
                <span className={`badge badge-xs badge-soft align-middle ${levelTone[d.level] ?? ""}`}>{LEVEL_LABEL[d.level]}</span>
              </p>
              <p className="text-base-content/70">
                {d.reason}
                {d.source && <span className="text-base-content/50"> · {d.source}</span>}
              </p>
            </li>
          ))}
        </ul>
      )}

      {review.issues.some((i) => i.severity === "minor") && (
        <Section title="Remarques de relecture">
          <ul className="space-y-1 text-sm text-base-content/75">
            {review.issues
              .filter((i) => i.severity === "minor")
              .map((i, k) => (
                <li key={k}>
                  <span className="text-base-content/50">{i.kind} · </span>
                  {i.message}
                </li>
              ))}
          </ul>
        </Section>
      )}

      <Section title="Alignement">
        <ul className="space-y-1.5 text-sm">
          {segments.map((seg, k) => (
            <li key={k} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
              <span className="font-greek">{seg.greek}</span>
              <span className={seg.tone}>{seg.french}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Analyse du grec">
        <p className="text-sm text-base-content/75">{analysis.structure}</p>
        {analysis.decisions.length > 0 && (
          <ul className="mt-2 space-y-2 text-sm">
            {analysis.decisions.map((d, k) => (
              <li key={k}>
                <p className="font-medium">{d.question}</p>
                <p className="text-base-content/65">
                  {d.options.join(" / ")} → {d.leaning}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {(proposal.rulesUsed.length > 0 || proposal.terms.length > 0) && (
        <Section title="Charte et glossaire appliqués">
          <ul className="space-y-1 text-sm text-base-content/70">
            {proposal.rulesUsed.map((r) => (
              <li key={r.id}>
                R{r.id} · {r.text}
              </li>
            ))}
            {proposal.terms.map((t) => (
              <li key={t.lemma}>
                <span className="font-greek">{t.lemma}</span> → {t.renderings.join(", ")}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <p className="text-xs text-base-content/45">
        {proposal.usage.input.toLocaleString("fr-FR")} jetons lus{proposal.usage.cached ? ` (${proposal.usage.cached.toLocaleString("fr-FR")} en cache)` : ""},{" "}
        {proposal.usage.output.toLocaleString("fr-FR")} écrits
      </p>
    </div>
  );
}
