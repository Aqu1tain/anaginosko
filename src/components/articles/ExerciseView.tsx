"use client";

import { Fragment, useState, type ReactNode } from "react";
import { displayOrder, type Exercise } from "@/src/lib/exercise";

// **gras** et *italique*, seuls styles permis dans un exercice.
function rich(text: string): ReactNode {
  return text.split(/(\*\*.+?\*\*|\*.+?\*)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}

function optionClass(i: number, picked: number | null, answer: number): string {
  const base = "w-full rounded-field border px-4 py-3 text-left transition-colors";
  if (picked === null) return `${base} border-base-300 bg-base-100 hover:border-primary/60 hover:bg-primary/5`;
  if (i === answer) return `${base} border-success bg-success/10`;
  if (i === picked) return `${base} border-error bg-error/10`;
  return `${base} border-base-300 bg-base-100 opacity-60`;
}

export default function ExerciseView({ exercise }: { exercise: Exercise }) {
  const [picked, setPicked] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const { question, options, answer, explanation } = exercise;
  if (!question) return null;

  const isQuiz = options.length > 1 && answer >= 0;
  const done = isQuiz ? picked !== null : revealed;
  const right = picked === answer;

  return (
    <div className="not-prose my-6 rounded-box border border-base-300 p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary/80">Exercice</p>
      <p className="mt-1 text-lg font-medium leading-snug">{rich(question)}</p>

      {isQuiz ? (
        <div className="mt-4 grid gap-2">
          {displayOrder(exercise).map((i) => (
            <button key={i} type="button" disabled={done} onClick={() => setPicked(i)} className={optionClass(i, picked, answer)}>
              {rich(options[i])}
            </button>
          ))}
        </div>
      ) : (
        !revealed && (
          <button type="button" className="btn btn-outline btn-sm mt-4" onClick={() => setRevealed(true)}>
            Voir la réponse
          </button>
        )
      )}

      {done && (
        <div className="mt-4">
          {isQuiz && <p className={`font-semibold ${right ? "text-success" : "text-error"}`}>{right ? "Exact." : "Pas tout à fait."}</p>}
          {explanation && <p className="mt-1 leading-relaxed text-base-content/80">{rich(explanation)}</p>}
        </div>
      )}
    </div>
  );
}
