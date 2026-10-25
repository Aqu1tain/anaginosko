"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import type { Mot } from "@/src/data/texts";
import type { Draft, Published } from "@/src/lib/workshopApi";
import type { Issue } from "./checks";

export type RowState = {
  ref: string;
  verse: number;
  words: { mot: Mot; index: number }[];
  base: string | null;
  published: Published | undefined;
  draft: Draft | undefined;
  value: string;
  saving: boolean;
  issues: Issue[];
  comments: number;
};

const STATUS: Record<string, { label: string; tone: string }> = {
  published: { label: "Publié", tone: "bg-success/15 text-success" },
  draft: { label: "Brouillon", tone: "bg-base-200 text-base-content/70" },
  review: { label: "Soumis", tone: "bg-info/15 text-info" },
  changes: { label: "À corriger", tone: "bg-warning/20 text-warning-content" },
  empty: { label: "Non traduit", tone: "bg-base-200/60 text-base-content/50" },
};

export const statusOf = (r: Pick<RowState, "draft" | "published">) => r.draft?.status ?? (r.published ? "published" : "empty");

// Un verset : le grec cliquable, la traduction de base, la zone de traduction et
// ses actions. Raccourcis : ⌘/Ctrl+Entrée verset suivant, ⌘/Ctrl+↑↓ naviguer,
// ⌘/Ctrl+Maj+Entrée soumettre, ⌘/Ctrl+B partir de la traduction de base.
export default function VerseRow({
  row,
  active,
  selectedWord,
  me,
  onFocus,
  onChange,
  onWord,
  onKey,
  onPublish,
  onRequestChanges,
  onDiscard,
}: {
  row: RowState;
  active: boolean;
  selectedWord: number | null;
  me: number | undefined;
  onFocus: () => void;
  onChange: (value: string) => void;
  onWord: (index: number) => void;
  onKey: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  onPublish: () => void;
  onRequestChanges: () => void;
  onDiscard: () => void;
}) {
  const area = useRef<HTMLTextAreaElement>(null);
  const status = statusOf(row);
  const reviewable = row.draft?.status === "review" && row.draft.authorId !== me;

  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [row.value]);

  return (
    <li
      id={`v${row.verse}`}
      className={`grid scroll-mt-28 gap-3 border-b border-base-300/70 py-4 lg:grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,1fr)] ${active ? "bg-primary/[0.03]" : ""}`}
    >
      <span className="pt-1 text-sm font-semibold tabular-nums text-base-content/50">{row.verse}</span>

      <div className="min-w-0">
        <p lang="grc" className="font-greek text-lg leading-relaxed">
          {row.words.map(({ mot, index }) => (
            <button
              key={index}
              type="button"
              onClick={() => onWord(index)}
              className={`rounded px-0.5 transition-colors hover:bg-primary/10 ${selectedWord === index ? "bg-primary/15 text-primary" : ""}`}
            >
              {mot.grec}
            </button>
          ))}
        </p>
        {row.base && <p className="mt-2 text-sm leading-relaxed text-base-content/70">{row.base}</p>}
      </div>

      <div className="min-w-0">
        <textarea
          ref={area}
          data-ref={row.ref}
          value={row.value}
          onFocus={onFocus}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKey}
          rows={2}
          lang="fr"
          spellCheck
          placeholder="Traduction…"
          className={`textarea textarea-bordered w-full resize-none overflow-hidden text-[0.95rem] leading-relaxed ${row.draft?.status === "changes" ? "border-warning" : ""}`}
        />
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className={`rounded-full px-2 py-0.5 font-medium ${STATUS[status].tone}`}>{STATUS[status].label}</span>
          {row.saving && <span className="text-base-content/50">Enregistrement…</span>}
          {row.draft && <span className="text-base-content/50">{row.draft.author}</span>}
          {row.comments > 0 && <span className="text-base-content/50">{row.comments} commentaire{row.comments > 1 ? "s" : ""}</span>}
          <span className="ml-auto flex flex-wrap gap-1">
            {row.draft && (row.draft.authorId === me || row.draft.status === "review") && (
              <button type="button" onClick={onPublish} className="btn btn-outline btn-xs" title="⌘ ⇧ Entrée">
                Publier
              </button>
            )}
            {reviewable && (
              <button type="button" onClick={onRequestChanges} className="btn btn-ghost btn-xs">
                Corrections
              </button>
            )}
            {row.draft && (
              <button type="button" onClick={onDiscard} className="btn btn-ghost btn-xs text-base-content/50">
                Annuler
              </button>
            )}
          </span>
        </div>
        {row.draft?.status === "changes" && row.draft.note && <p className="mt-1.5 rounded-md bg-warning/10 px-2 py-1 text-xs">{row.draft.note}</p>}
        {row.issues.length > 0 && (
          <ul className="mt-1.5 space-y-0.5 text-xs">
            {row.issues.map((i) => (
              <li key={i.message} className={i.kind === "term" ? "text-warning-content" : "text-error"}>
                {i.kind === "term" ? "Terme clé · " : ""}
                {i.message}
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}
