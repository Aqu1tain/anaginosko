"use client";

import { useEffect, useMemo, useState } from "react";
import { parseCitation, matchBooks, bookFullName, chapterRefLabel } from "@/src/data/refParse";
import { loadChapterVerses, loadBookChapters, sliceVerses } from "./citationText";
import type { VerseLine, VerseQuoteProps, ChapterRefProps } from "./citationTypes";

type Mode = "verse" | "chapter";

export default function CitationPicker({
  mode,
  initialQuery = "",
  initialShowFrench = true,
  onConfirm,
  onClose,
}: {
  mode: Mode;
  initialQuery?: string;
  initialShowFrench?: boolean;
  onConfirm: (props: VerseQuoteProps | ChapterRefProps) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [showFrench, setShowFrench] = useState(initialShowFrench);
  const [form, setForm] = useState<"short" | "long">("long");
  const [verses, setVerses] = useState<VerseLine[] | null>(null);
  const [maxChapter, setMaxChapter] = useState<number | null>(null);

  const ref = useMemo(() => parseCitation(query), [query]);
  const suggestions = useMemo(() => (ref ? [] : matchBooks(query.replace(/\d.*$/, "").trim())), [ref, query]);

  const chapterValid = ref != null && (maxChapter == null || ref.chapter <= maxChapter);
  const needsVerse = mode === "verse" && (!ref || ref.verseStart == null);

  useEffect(() => {
    if (!ref) {
      setVerses(null);
      setMaxChapter(null);
      return;
    }
    loadBookChapters(ref.corpus).then((m) => setMaxChapter(m[ref.book] ?? null)).catch(() => setMaxChapter(null));
    if (mode !== "verse" || ref.verseStart == null) {
      setVerses(null);
      return;
    }
    let alive = true;
    const vs = ref.verseStart;
    const ve = ref.verseEnd ?? vs;
    loadChapterVerses(ref.corpus, ref.book, ref.chapter)
      .then((bv) => alive && setVerses(sliceVerses(bv, vs, ve)))
      .catch(() => alive && setVerses([]));
    return () => {
      alive = false;
    };
  }, [ref, mode]);

  const confirm = () => {
    if (!ref || !chapterValid) return;
    if (mode === "chapter") {
      onConfirm({ corpus: ref.corpus, book: ref.book, chapter: ref.chapter, form });
      return;
    }
    if (ref.verseStart == null) return;
    onConfirm({
      corpus: ref.corpus,
      book: ref.book,
      chapter: ref.chapter,
      verseStart: ref.verseStart,
      verseEnd: ref.verseEnd ?? ref.verseStart,
      showFrench,
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-[10vh]" onClick={onClose}>
      <div className="w-full max-w-lg rounded-box bg-base-100 p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold">{mode === "verse" ? "Citation biblique" : "Référence de chapitre"}</h2>

        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && confirm()}
          placeholder={mode === "verse" ? "ex. Jean 1:1-5, Gen 1,1-3" : "ex. Genèse 1, Jn 3"}
          className="input input-bordered mt-3 w-full"
        />

        {suggestions.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1">
            {suggestions.map((s) => (
              <li key={`${s.corpus}-${s.book}`}>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => setQuery((q) => `${s.name} ${q.replace(/^\D*/, "")}`.trim())}
                >
                  {s.name}
                </button>
              </li>
            ))}
          </ul>
        )}

        {ref && !chapterValid && (
          <p className="mt-2 text-sm text-error">Ce livre n&apos;a que {maxChapter} chapitres.</p>
        )}
        {ref && chapterValid && needsVerse && (
          <p className="mt-2 text-sm text-base-content/60">Précisez au moins un verset (ex. {bookFullName(ref.corpus, ref.book)} {ref.chapter}:1).</p>
        )}

        {mode === "verse" && ref && chapterValid && !needsVerse && (
          <div className="mt-3 rounded-lg border border-base-300 p-3">
            <div className="font-greek text-base leading-relaxed">
              {verses === null ? (
                <span className="text-base-content/40">Chargement…</span>
              ) : verses.length === 0 ? (
                <span className="text-error">Verset introuvable.</span>
              ) : (
                verses.map((v) => (
                  <span key={v.v}>
                    <sup className="mr-0.5 text-[0.6em] text-base-content/45">{v.v}</sup>
                    {v.greek}{" "}
                  </span>
                ))
              )}
            </div>
            {showFrench && verses && verses.some((v) => v.french) && (
              <div className="mt-2 space-y-1 text-sm text-base-content/70">
                {verses.filter((v) => v.french).map((v) => (
                  <p key={v.v}>{v.french}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {mode === "verse" ? (
          <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" className="checkbox checkbox-sm" checked={showFrench} onChange={(e) => setShowFrench(e.target.checked)} />
            Afficher la traduction française
          </label>
        ) : (
          <div className="mt-3">
            <span className="text-sm font-medium">Forme du renvoi</span>
            <div className="mt-1 flex gap-2">
              {(["short", "long"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`btn btn-sm ${form === f ? "btn-primary" : "btn-outline"}`}
                  onClick={() => setForm(f)}
                  disabled={!ref}
                >
                  {ref ? chapterRefLabel(ref.corpus, ref.book, ref.chapter, f) : f === "short" ? "Courte" : "Longue"}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary btn-sm" disabled={!ref || !chapterValid || needsVerse} onClick={confirm}>
            Insérer
          </button>
        </div>
      </div>
    </div>
  );
}
