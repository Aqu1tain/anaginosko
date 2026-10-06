"use client";

import { accentLabel, breathingLabel, type GraphemeInfo } from "../../lib/greek";

function Pron({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 rounded-box bg-base-200 px-3 py-2.5">
      <div className="text-[0.7rem] font-medium uppercase tracking-wide text-base-content/70">{label}</div>
      <div className="mt-0.5 text-lg font-medium">{value}</div>
    </div>
  );
}

// Fiche d'une lettre : nom, formes, prononciations, signes diacritiques. Pleine sur
// la page alphabet, compacte quand on la détaille depuis un mot.
export default function LetterDetail({ info, compact = false }: { info: GraphemeInfo; compact?: boolean }) {
  const letter = info.letter;
  if (!letter) return null;
  const marks = [
    breathingLabel(info.breathing),
    accentLabel(info.accent),
    info.iotaSubscript ? "Iota souscrit" : null,
    info.isFinalSigma ? "Sigma final (ς)" : null,
  ].filter((c): c is string => c !== null);

  return (
    <div>
      <div className="flex items-center gap-4">
        <div
          lang="grc"
          className={`font-greek flex shrink-0 items-center justify-center rounded-box bg-accent/15 text-accent ${compact ? "h-12 w-12 text-3xl" : "h-16 w-16 text-4xl"}`}
        >
          {info.cluster}
        </div>
        <div className="min-w-0">
          <div className={compact ? "text-lg font-semibold" : "text-xl font-semibold"}>{letter.name}</div>
          <div className="font-greek text-base text-base-content/70">
            {letter.upper} {letter.lower}
            {letter.final ? ` ${letter.final}` : ""}
            <span className="font-sans"> · « {letter.latin} »</span>
          </div>
        </div>
      </div>
      <div className="mt-3 flex gap-2.5">
        <Pron label="Érasmien" value={letter.erasmien} />
        <Pron label="Restituée" value={letter.restituee} />
      </div>
      {letter.note && <p className="mt-3 text-sm leading-relaxed text-base-content/70">{letter.note}</p>}
      {marks.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {marks.map((m) => (
            <span key={m} className="badge badge-sm badge-ghost">
              {m}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
