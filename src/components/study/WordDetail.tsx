"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { analyzeGrapheme, isClickable, segment } from "../../lib/greek";
import type { WordContext } from "../../lib/tokenize";
import { corpusById, parseRef } from "../../data/corpus";
import { useAuth } from "../../hooks/useAuth";
import { useCorpusGloss } from "../../hooks/useCorpusGloss";
import { useLemmaNotes } from "../../hooks/useLemmaNotes";
import { useLemmaDefinition } from "../../hooks/useLemmaDefinition";
import { can } from "../../lib/api";
import ReportButton from "../ReportButton";
import { LexiconSense, LexiconVia } from "../BaillyNotice";
import LetterDetail from "./LetterDetail";
import { WordPronunciation } from "./Pronunciation";

const eyebrow = "text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-base-content/55";

function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-t border-base-300 py-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className={eyebrow}>{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

// Glyphe du mot voisin dans le même texte, dans l'ordre du document (un chapitre
// peut être rendu verset par verset, en plusieurs blocs).
function neighbourGlyph(textRef: string, w: number, dir: 1 | -1): HTMLElement | null {
  const glyphs = [...document.querySelectorAll<HTMLElement>(`[data-text-ref="${CSS.escape(textRef)}"] .glyph`)];
  const words = [...new Set(glyphs.map((g) => Number(g.dataset.w)))];
  const target = words[words.indexOf(w) + dir];
  return target == null ? null : (glyphs.find((g) => Number(g.dataset.w) === target) ?? null);
}

const editable = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));

function useWordSteps(textRef: string | null, w: number) {
  const [has, setHas] = useState({ prev: false, next: false });

  useEffect(() => {
    if (!textRef) return;
    setHas({ prev: !!neighbourGlyph(textRef, w, -1), next: !!neighbourGlyph(textRef, w, 1) });
  }, [textRef, w]);

  const go = (dir: 1 | -1) => {
    const glyph = textRef ? neighbourGlyph(textRef, w, dir) : null;
    if (!glyph) return;
    glyph.click();
    glyph.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || editable(e.target)) return;
      if (e.target instanceof HTMLElement && e.target.closest(".glyph")) return;
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  return { has, go };
}

function SenseBadge({ source }: { source: "biblion" | "bailly" | "none" }) {
  if (source === "biblion") return <span className="badge badge-sm badge-primary">Biblion</span>;
  if (source === "bailly") return <span className="badge badge-sm badge-ghost">Bailly</span>;
  return <span className="badge badge-sm badge-warning badge-soft">À documenter</span>;
}

// Détail d'un mot dans le panneau d'étude : le mot (ses lettres se détaillent au
// toucher), son lemme, son analyse, son sens, puis sa prononciation.
export default function WordDetail({
  word,
  textRef,
  wordIndex,
  verse,
}: {
  word: WordContext;
  textRef: string | null;
  wordIndex: number;
  verse: number | null;
}) {
  const graphemes = useMemo(() => segment(word.grec).map(analyzeGrapheme), [word.grec]);
  const [letter, setLetter] = useState<number | null>(null);
  const { has, go } = useWordSteps(textRef, wordIndex);

  const { user } = useAuth();
  const ref = textRef ? parseRef(textRef) : null;
  const corpus = corpusById(ref?.corpus ?? "nt");
  const place = ref ? `${corpus.bookNames[ref.book] ?? ref.book} ${ref.chapter}${verse ? `, ${verse}` : ""}` : "Le mot";
  const lexical = useCorpusGloss(word.lemme, corpus);
  const { notes } = useLemmaNotes(word.lemme);
  const { definition } = useLemmaDefinition(word.lemme);
  const fiche = word.lemme ? `${corpus.concordanceBase}/${encodeURIComponent(word.lemme)}` : null;
  const source = definition ? "biblion" : lexical.status === "verified" ? "bailly" : "none";

  return (
    <div>
      <header className="pr-10">
        <p className={eyebrow}>{place}</p>
        <div lang="grc" className="font-greek mt-1 flex flex-wrap text-[2.5rem] leading-tight">
          {graphemes.map((g, i) =>
            isClickable(g) ? (
              <button
                key={i}
                type="button"
                onClick={() => setLetter((l) => (l === i ? null : i))}
                aria-pressed={letter === i}
                aria-label={`Lettre ${g.letter?.name}`}
                className={`rounded-md px-px transition-colors hover:bg-accent/15 hover:text-accent ${letter === i ? "bg-accent/15 text-accent" : ""}`}
              >
                {g.cluster}
              </button>
            ) : (
              <span key={i}>{g.cluster}</span>
            ),
          )}
        </div>
        {word.lemme && fiche && (
          <p className="mt-1 text-base text-base-content/70">
            de{" "}
            <Link href={fiche} lang="grc" className="font-greek text-xl font-semibold text-base-content hover:text-primary">
              {word.lemme}
            </Link>
          </p>
        )}
        {letter == null ? (
          <p className="mt-2 text-xs text-base-content/50">Touchez une lettre du mot pour la détailler.</p>
        ) : (
          <div className="mt-3 rounded-box border border-accent/25 bg-accent/5 p-3">
            <LetterDetail info={graphemes[letter]} compact />
          </div>
        )}
      </header>

      <div className="mt-4">
        {word.morph && (
          <Section title="Analyse">
            <p className="text-[0.95rem] leading-snug">
              <span className="font-semibold">{word.nature}</span>
              <span className="text-base-content/75"> · {word.morph}</span>
            </p>
          </Section>
        )}

        {word.lemme && (
          <Section title="Sens" aside={<SenseBadge source={source} />}>
            {definition ? (
              <p className="whitespace-pre-wrap text-[0.95rem] leading-relaxed text-base-content/90">{definition.body}</p>
            ) : lexical.status === "verified" && lexical.gloss ? (
              <>
                <LexiconVia via={lexical.via} />
                <LexiconSense gloss={lexical.gloss} collapsible />
                <p className="mt-2 text-xs leading-snug text-base-content/55">Lexique général, à confirmer dans le contexte biblique.</p>
              </>
            ) : lexical.loading || definition === undefined ? (
              <p className="text-sm text-base-content/60">Recherche du sens…</p>
            ) : (
              <p className="text-sm leading-snug text-base-content/65">Aucun sens fiable publié pour ce lemme.</p>
            )}
            {notes && notes.length > 0 && (
              <div className="mt-3 rounded-box border border-primary/30 bg-primary/5 px-3 py-2.5">
                <div className="text-[0.65rem] font-semibold uppercase tracking-wide text-primary">Note · Biblion</div>
                <div className="mt-1 grid gap-2">
                  {notes.map((n) => (
                    <div key={n.id}>
                      <p className="text-sm leading-snug text-base-content/85">{n.body}</p>
                      {n.source && <p className="mt-0.5 text-xs text-base-content/60">{n.source}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Section>
        )}

        <Section title="Prononciation">
          <WordPronunciation word={word} textRef={textRef} wordIndex={wordIndex} canEdit={can(user, "annotations")} />
        </Section>

        <div className="flex flex-col gap-3 border-t border-base-300 pt-4">
          {fiche && (
            <Link href={fiche} className="btn btn-primary btn-sm h-10 rounded-full">
              Toutes les occurrences de <span lang="grc" className="font-greek text-base">{word.lemme}</span>
            </Link>
          )}
          <div className="flex items-center justify-between gap-2">
            <div className="join">
              <button type="button" onClick={() => go(-1)} disabled={!has.prev} className="btn btn-ghost btn-sm join-item" aria-label="Mot précédent" title="Mot précédent (←)">
                ‹ Précédent
              </button>
              <button type="button" onClick={() => go(1)} disabled={!has.next} className="btn btn-ghost btn-sm join-item" aria-label="Mot suivant" title="Mot suivant (→)">
                Suivant ›
              </button>
            </div>
            {word.lemme && (
              <ReportButton
                label="Signaler la définition ou demander une note"
                target={{
                  ref: `def:${word.lemme}`,
                  verse: null,
                  wordIndex: null,
                  endWordIndex: null,
                  graphemeIndex: null,
                  annotationId: null,
                  grec: word.lemme,
                  scopeLabel: "définition",
                  categories: ["definition", "demande_note"],
                }}
              >
                Signaler
              </ReportButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
