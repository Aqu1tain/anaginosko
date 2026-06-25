"use client";

import { Fragment, memo, useEffect, useMemo, useRef, useState } from "react";
import type { Text } from "../data/texts";
import { tokenizeText } from "../lib/tokenize";
import { isClickable, type GraphemeInfo } from "../lib/greek";
import { useSheet } from "./SheetContext";
import type { Annotation } from "../lib/api";
import AnnotationMarker from "./AnnotationMarker";
import Translit from "./Translit";

export type TranslitMode = "off" | "erasmien" | "restituee";
export type AnnoScope = "char" | "word" | "phrase";
export type AnnoSelection = { from: number; to: number; g: number; scope: AnnoScope } | null;

function GreekText({
  text,
  size,
  scale = 1,
  translit = "off",
  manuscript = false,
  verseOnly = null,
  highlightWord = null,
  spanWords,
  charSpots,
  markers,
  annotateMode = false,
  selection = null,
  onSelectLetter,
  canManage,
  onEditAnnotation,
  onDeleteAnnotation,
}: {
  text: Text;
  size: "lg" | "md";
  /** Multiplicateur de taille du texte grec (contrôle lecteur). */
  scale?: number;
  translit?: TranslitMode;
  manuscript?: boolean;
  /** Ne rendre que les mots de ce verset (mode étude). */
  verseOnly?: number | null;
  /** Index de jeton à surligner temporairement (suivi de concordance). */
  highlightWord?: number | null;
  /** Mots couverts par une annotation mot/phrase -> soulignement du mot. */
  spanWords?: Map<number, Annotation[]>;
  /** Caractères annotés, clé `${w}:${g}` -> soulignement de la lettre. */
  charSpots?: Map<string, Annotation[]>;
  /** Pastille ⓘ à poser après ce mot (fin de groupe / mot / caractère). */
  markers?: Map<number, Annotation[]>;
  /** Mode philologue : un clic sélectionne une lettre/un mot. */
  annotateMode?: boolean;
  selection?: AnnoSelection;
  onSelectLetter?: (wordIndex: number, graphemeIndex: number, cluster: string) => void;
  canManage?: (a: Annotation) => boolean;
  onEditAnnotation?: (a: Annotation) => void;
  onDeleteAnnotation?: (a: Annotation) => void;
}) {
  const { active, clickLetter } = useSheet();
  const containerRef = useRef<HTMLDivElement>(null);
  const [flashW, setFlashW] = useState<number | null>(null);
  const tokens = useMemo(() => tokenizeText(text), [text]);
  // Interlinéaire = prononciation sous chaque mot (moderne ET manuscrit).
  const interlinear = translit !== "off";

  // Mots avec leur index de jeton d'origine (stable pour data-w / activate).
  const words = useMemo(() => {
    const arr: Array<[number, (typeof tokens)[number] & { type: "word" }]> = [];
    tokens.forEach((t, i) => {
      if (t.type === "word") arr.push([i, t as never]);
    });
    return arr;
  }, [tokens]);

  const shown = verseOnly == null ? words : words.filter(([, t]) => t.word.verse === verseOnly);

  const firstKey = useMemo(() => {
    for (const [w, t] of shown) {
      const g = t.word.graphemes.findIndex(isClickable);
      if (g >= 0) return `${w}:${g}`;
    }
    return null;
  }, [shown]);

  const tabbableKey = active?.key ?? firstKey;
  const activeWord = active && active.stage === 2 ? active.w : -1;

  // Surlignage temporaire d'un mot (arrivée depuis la concordance).
  useEffect(() => {
    if (highlightWord == null) return;
    const el = containerRef.current?.querySelector<HTMLElement>(`[data-w="${highlightWord}"]`);
    if (!el) return; // le mot n'est pas dans cette instance (autre verset)
    setFlashW(highlightWord);
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    const t = setTimeout(() => setFlashW(null), 2600);
    return () => clearTimeout(t);
  }, [highlightWord]);

  const activate = (el: HTMLElement) => {
    const w = Number(el.dataset.w);
    const g = Number(el.dataset.g);
    const token = tokens[w];
    if (!token || token.type !== "word") return;
    const info = token.word.graphemes[g];
    if (!info) return;
    // Mode philologue : un clic sélectionne la lettre/le mot à annoter.
    if (annotateMode && onSelectLetter) {
      onSelectLetter(w, g, manuscript ? (info.letter?.upper ?? info.cluster) : info.cluster);
      return;
    }
    clickLetter({ w, g, info, word: token.word.context });
  };

  const moveFocus = (current: HTMLElement, to: "prev" | "next" | "first" | "last") => {
    const all = Array.from(containerRef.current?.querySelectorAll<HTMLElement>(".glyph") ?? []);
    if (all.length === 0) return;
    const i = all.indexOf(current);
    const next =
      to === "first" ? all[0]
      : to === "last" ? all[all.length - 1]
      : to === "next" ? all[Math.min(all.length - 1, i + 1)]
      : all[Math.max(0, i - 1)];
    current.tabIndex = -1;
    next.tabIndex = 0;
    next.focus();
  };

  const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>(".glyph");
    if (el) activate(el);
  };

  // Neutralise la sélection native du double/triple-clic sur une lettre ; le
  // glisser pour copier reste possible.
  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.detail > 1 && (e.target as HTMLElement).closest(".glyph")) e.preventDefault();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>(".glyph");
    if (!el) return;
    const actions: Record<string, () => void> = {
      Enter: () => activate(el),
      " ": () => activate(el),
      ArrowRight: () => moveFocus(el, "next"),
      ArrowDown: () => moveFocus(el, "next"),
      ArrowLeft: () => moveFocus(el, "prev"),
      ArrowUp: () => moveFocus(el, "prev"),
      Home: () => moveFocus(el, "first"),
      End: () => moveFocus(el, "last"),
    };
    const action = actions[e.key];
    if (action) {
      e.preventDefault();
      action();
    }
  };

  // Taille de base (rem) × multiplicateur du contrôle lecteur, posée en style
  // inline ; les enfants (glyphes, interlinéaire en `em`) suivent.
  const baseRem = size === "lg" ? 1.95 : 1.5;
  const fontSize = `${(baseRem * scale).toFixed(3)}rem`;
  const containerSpacing = interlinear
    ? manuscript
      ? "leading-snug tracking-wide"
      : "leading-snug"
    : manuscript
      ? "leading-relaxed tracking-wide break-all"
      : size === "lg"
        ? "leading-[1.85]"
        : "leading-[1.8]";

  const verseAt = useMemo(() => {
    const map = new Map<number, number>();
    let last: number | null = null;
    for (const [w, t] of words) {
      const v = t.word.verse;
      if (v != null && v !== last) map.set(w, v);
      if (v != null) last = v;
    }
    return map;
  }, [words]);

  const verseMark = (w: number) =>
    !manuscript && verseAt.has(w) ? <span className="verse-num">{verseAt.get(w)}</span> : null;

  const selFrom = selection ? Math.min(selection.from, selection.to) : -1;
  const selTo = selection ? Math.max(selection.from, selection.to) : -1;
  const wordSelected = (w: number) =>
    selection != null && selection.scope !== "char" && w >= selFrom && w <= selTo;

  const renderGlyphs = (graphemes: GraphemeInfo[], w: number) =>
    graphemes.map((info, g) => {
      if (!isClickable(info)) return manuscript ? null : <span key={g}>{info.cluster}</span>;
      const key = `${w}:${g}`;
      const charAnno = charSpots?.has(key);
      const charSel =
        selection?.scope === "char" && w === selection.from && g === selection.g;
      return (
        <span
          key={g}
          className={`glyph${active?.key === key ? " is-active" : ""}${charAnno ? " glyph-annotated" : ""}${charSel ? " glyph-selected" : ""}`}
          role="button"
          tabIndex={key === tabbableKey ? 0 : -1}
          aria-label={`Lettre ${info.letter!.name}`}
          data-w={w}
          data-g={g}
        >
          {manuscript ? info.letter!.upper : info.cluster}
        </span>
      );
    });

  const markerFor = (w: number) => {
    const annos = markers?.get(w);
    if (!annos?.length) return null;
    return (
      <AnnotationMarker
        annotations={annos}
        canManage={canManage}
        onEdit={onEditAnnotation}
        onDelete={onDeleteAnnotation}
      />
    );
  };

  return (
    <div
      ref={containerRef}
      dir="ltr"
      lang="grc"
      role="group"
      aria-label="Texte grec, sélectionnez une lettre pour ses indices"
      onClick={onClick}
      onMouseDown={onMouseDown}
      onKeyDown={onKeyDown}
      style={{ fontSize }}
      className={`font-greek ${containerSpacing}`}
    >
      {shown.map(([w, token], idx) => {
        const glyphs = renderGlyphs(token.word.graphemes, w);
        const annoCls = spanWords?.has(w) ? " word-annotated" : "";
        const selCls = wordSelected(w) ? " word-selected" : "";
        const wordCls = `whitespace-nowrap${w === activeWord ? " word-active" : ""}${w === flashW ? " word-flash" : ""}${annoCls}${selCls}`;

        if (!interlinear) {
          return (
            <Fragment key={w}>
              {idx > 0 && !manuscript ? " " : null}
              {verseMark(w)}
              <span className={wordCls}>{glyphs}</span>
              {markerFor(w)}
            </Fragment>
          );
        }

        const ctx = token.word.context;
        const tr = ctx ? (translit === "restituee" ? ctx.restituee : ctx.erasmien) : null;
        return (
          <span
            key={w}
            className={`mb-2 inline-flex flex-col items-center align-top ${manuscript ? "mr-1.5" : "mr-2.5"}`}
          >
            <span className={wordCls}>
              {verseMark(w)}
              {glyphs}
              {markerFor(w)}
            </span>
            {tr && (
              <span className="mt-0.5 font-sans text-[0.42em] leading-tight text-base-content/65">
                <Translit value={tr} stressedClass="text-accent" />
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

export default memo(GreekText);
