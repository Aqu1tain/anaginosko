import { Fragment, memo, useMemo, useRef } from "react";
import type { Text } from "../data/texts";
import { tokenizeText } from "../lib/tokenize";
import { isClickable, type GraphemeInfo } from "../lib/greek";
import { useSheet } from "./SheetContext";
import Translit from "./Translit";

export type TranslitMode = "off" | "erasmien" | "restituee";

function GreekText({
  text,
  size,
  translit = "off",
}: {
  text: Text;
  size: "lg" | "md";
  translit?: TranslitMode;
}) {
  const { active, clickLetter } = useSheet();
  const containerRef = useRef<HTMLDivElement>(null);
  const tokens = useMemo(() => tokenizeText(text), [text]);
  const interlinear = translit !== "off";

  // Roving tabindex : une seule lettre est dans l'ordre de tabulation.
  const firstKey = useMemo(() => {
    for (let w = 0; w < tokens.length; w++) {
      const t = tokens[w];
      if (t.type !== "word") continue;
      const g = t.word.graphemes.findIndex(isClickable);
      if (g >= 0) return `${w}:${g}`;
    }
    return null;
  }, [tokens]);

  const tabbableKey = active?.key ?? firstKey;
  const activeWord = active && active.stage === 2 ? active.w : -1;

  const activate = (el: HTMLElement) => {
    const w = Number(el.dataset.w);
    const g = Number(el.dataset.g);
    const token = tokens[w];
    if (!token || token.type !== "word") return;
    const info = token.word.graphemes[g];
    if (!info) return;
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

  const greekSize = size === "lg" ? "text-[1.95rem]" : "text-2xl";
  const lineSpace = interlinear ? "leading-snug" : size === "lg" ? "leading-[1.85]" : "leading-[1.8]";

  // Index de jeton -> numéro de verset à afficher (au premier mot de chaque verset).
  const verseAt = useMemo(() => {
    const map = new Map<number, number>();
    let last: number | null = null;
    tokens.forEach((tk, i) => {
      if (tk.type !== "word") return;
      const v = tk.word.verse;
      if (v != null && v !== last) map.set(i, v);
      if (v != null) last = v;
    });
    return map;
  }, [tokens]);

  const verseMark = (w: number) =>
    verseAt.has(w) ? <span className="verse-num">{verseAt.get(w)}</span> : null;

  const renderGlyphs = (graphemes: GraphemeInfo[], w: number) =>
    graphemes.map((info, g) => {
      if (!isClickable(info)) return <span key={g}>{info.cluster}</span>;
      const key = `${w}:${g}`;
      return (
        <span
          key={g}
          className={`glyph${active?.key === key ? " is-active" : ""}`}
          role="button"
          tabIndex={key === tabbableKey ? 0 : -1}
          aria-label={`Lettre ${info.letter!.name}`}
          data-w={w}
          data-g={g}
        >
          {info.cluster}
        </span>
      );
    });

  return (
    <div
      ref={containerRef}
      dir="ltr"
      lang="grc"
      role="group"
      aria-label="Texte grec, sélectionnez une lettre pour ses indices"
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={`font-greek ${greekSize} ${lineSpace}`}
    >
      {tokens.map((token, w) => {
        if (token.type === "space") return interlinear ? null : <span key={w}> </span>;
        const glyphs = renderGlyphs(token.word.graphemes, w);
        const wordCls = `whitespace-nowrap${w === activeWord ? " word-active" : ""}`;
        if (!interlinear) {
          return (
            <Fragment key={w}>
              {verseMark(w)}
              <span className={wordCls}>{glyphs}</span>
            </Fragment>
          );
        }
        const ctx = token.word.context;
        const tr = ctx ? (translit === "restituee" ? ctx.restituee : ctx.erasmien) : null;
        return (
          <span key={w} className="mr-2.5 mb-2 inline-flex flex-col items-center align-top">
            <span className={wordCls}>
              {verseMark(w)}
              {glyphs}
            </span>
            {tr && (
              <span className="mt-0.5 font-sans text-[0.8rem] leading-tight text-base-content/65">
                <Translit value={tr} stressedClass="font-semibold text-accent" />
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

export default memo(GreekText);
