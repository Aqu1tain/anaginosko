"use client";

import { Fragment, useMemo, useState, type ReactNode } from "react";
import { parseBaillyHtml, type BaillyNode } from "../lib/baillyHtml";
import type { BaillyNotice as Notice } from "../lib/bailly";
import type { Gloss } from "../data/glosses";
import { useBaillyNotice } from "../hooks/useBaillyNotice";

// Blocs du Bailly : grands sens (A, B), sous-sens (I, II), numéros (1, 2),
// sections et étymologie.
const BLOCKS: Record<string, string> = {
  Rub: "mt-3",
  rub: "mt-2 border-l-2 border-base-300 pl-3",
  pp: "mt-1.5 pl-3",
  sect: "mt-2 pl-3",
  moyen: "mt-2 pl-3",
  fleche: "mt-2 pl-3",
  etymor: "mt-3 border-t border-base-300 pt-2 text-[0.9em] text-base-content/70",
  etymrev: "mt-3 border-t border-base-300 pt-2 text-[0.9em] text-base-content/70",
};

// Repères de sens, rendus en pastilles pour aérer le pavé du dictionnaire.
const MARKS: Record<string, string> = {
  Ruba: "bg-primary/10 text-primary",
  ruba: "bg-base-200 text-base-content/70",
  ppa: "border border-base-300 text-base-content/60",
  secta: "bg-base-200 text-base-content/70",
  moyena: "bg-base-200 text-base-content/70",
  flechea: "bg-base-200 text-base-content/70",
};

const INLINES: Record<string, string> = {
  entreea: "font-greek font-semibold text-base-content",
  grec: "font-greek",
  "grec-longueur": "font-greek",
  gens: "font-semibold",
  des: "font-semibold",
  es: "font-semibold",
  ital: "italic text-base-content/70",
  aut: "[font-variant:small-caps] text-base-content/60",
  oeuv: "italic text-base-content/60",
  oeuva: "italic text-base-content/60",
  refch: "italic text-base-content/60",
  refpa: "italic text-base-content/60",
  refpb: "ml-0.5 text-base-content/60",
  lat: "italic",
  indoeurop: "italic",
  etiqetymor: "mr-1 text-[0.75em] font-semibold uppercase tracking-wide",
  etiqetymrev: "mr-1 text-[0.75em] font-semibold uppercase tracking-wide",
};

// « || » sépare les grands sens chez Bailly : conservé tel quel, mais estompé.
function renderText(text: string, key: number): ReactNode {
  const parts = text.split("||");
  if (parts.length === 1) return text;
  return parts.map((part, i) => (
    <Fragment key={`${key}-${i}`}>
      {i > 0 && <span className="mx-1 text-base-content/30">||</span>}
      {part}
    </Fragment>
  ));
}

function render(nodes: BaillyNode[]): ReactNode[] {
  return nodes.map((node, i) => {
    if (typeof node === "string") return <Fragment key={i}>{renderText(node, i)}</Fragment>;
    const mark = MARKS[node.cls];
    if (mark) {
      return (
        <span
          key={i}
          className={`mr-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 align-baseline text-[0.7rem] font-semibold not-italic ${mark}`}
        >
          {render(node.children)}
        </span>
      );
    }
    if (node.tag === "div") {
      return (
        <div key={i} className={BLOCKS[node.cls] ?? "mt-2"}>
          {render(node.children)}
        </div>
      );
    }
    return (
      <span key={i} className={INLINES[node.cls] ?? ""}>
        {render(node.children)}
      </span>
    );
  });
}

function Sense({ html }: { html: string }) {
  const nodes = useMemo(() => parseBaillyHtml(html), [html]);
  return <div>{render(nodes)}</div>;
}

const LONG = 2500;

// Notice complète. `collapsible` replie les notices longues derrière un bouton
// « Développer », avec un fondu qui signale la coupe.
export default function BaillyNotice({
  notice,
  collapsible = false,
  compact = false,
}: {
  notice: Notice;
  collapsible?: boolean;
  compact?: boolean;
}) {
  const length = notice.senses.reduce((n, s) => n + s.html.length, 0);
  const foldable = collapsible && length >= LONG;
  const [open, setOpen] = useState(!foldable);
  const many = notice.senses.length > 1;

  return (
    <div className={compact ? "text-sm leading-snug text-base-content/85" : "text-[0.95rem] leading-relaxed text-base-content/85"}>
      <div className={open ? undefined : "relative max-h-72 overflow-hidden"}>
        {notice.senses.map((sense, i) => (
          <div key={i} className={i > 0 ? "mt-4 border-t border-dashed border-base-300 pt-3" : undefined}>
            {many && (
              <div className="mb-1 text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-base-content/50">
                Homonyme {i + 1}
              </div>
            )}
            <Sense html={sense.html} />
          </div>
        ))}
        {!open && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-base-100 to-transparent" aria-hidden="true" />
        )}
      </div>
      {foldable && (
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="btn btn-ghost btn-xs mt-2 text-primary">
          {open ? "Réduire la notice" : "Développer la notice"}
        </button>
      )}
    </div>
  );
}

// Extrait court (150 caractères, fourni par le lexique) : « || » sépare les
// grands sens, la vedette et sa morphologie sont mises en avant.
export function BaillyExcerpt({ excerpt, compact = false }: { excerpt: string; compact?: boolean }) {
  const segments = excerpt.split(/\s*\|\|\s*/).map((s) => s.trim()).filter(Boolean);
  const text = compact ? "text-sm leading-snug text-base-content/80" : "text-[0.95rem] leading-relaxed text-base-content/85";
  return (
    <div className={compact ? "space-y-1" : "space-y-2"}>
      {segments.map((seg, i) => {
        const close = i === 0 ? seg.indexOf(")") : -1;
        return (
          <div key={i} className="flex items-start gap-2.5">
            {segments.length > 1 && (
              <span className="mt-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-base-200 px-1 text-[0.65rem] font-semibold text-base-content/60">
                {i + 1}
              </span>
            )}
            <p className={`min-w-0 ${text}`}>
              {close !== -1 ? (
                <><strong className="font-greek font-semibold">{seg.slice(0, close + 1)}</strong>{seg.slice(close + 1)}</>
              ) : seg}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// Sens lexical d'un lemme : la notice complète quand on l'a (rendue serveur ou
// chargée à la demande), sinon l'extrait tronqué avec un bouton pour la charger.
export function LexiconSense({
  gloss,
  notice,
  collapsible = false,
  compact = false,
}: {
  gloss: Gloss;
  notice?: Notice | null;
  collapsible?: boolean;
  compact?: boolean;
}) {
  const [wanted, setWanted] = useState(false);
  const loaded = useBaillyNotice(notice ? null : gloss.uri, wanted);
  const full = notice ?? loaded.notice;
  const cropped = gloss.excerpt.trimEnd().endsWith("…");

  if (full) {
    return (
      <>
        <BaillyNotice notice={full} collapsible={collapsible} compact={compact} />
        {!notice && (
          <button type="button" onClick={() => setWanted(false)} className="btn btn-ghost btn-xs mt-2 text-primary">
            Réduire
          </button>
        )}
      </>
    );
  }

  return (
    <>
      <BaillyExcerpt excerpt={gloss.excerpt} compact={compact} />
      {cropped && (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          {loaded.loading ? (
            <span className="inline-flex items-center gap-2 text-xs text-base-content/60" aria-live="polite">
              <span className="loading loading-spinner loading-xs" aria-hidden="true" />
              Chargement de la notice…
            </span>
          ) : wanted && loaded.notice === null ? (
            <span className="text-xs text-base-content/60">
              Notice indisponible pour le moment.{" "}
              <a href={`https://bailly.app/${encodeURIComponent(gloss.uri)}`} target="_blank" rel="noreferrer" className="link">
                Ouvrir sur Bailly.app ↗
              </a>
            </span>
          ) : (
            <button type="button" onClick={() => setWanted(true)} className="btn btn-ghost btn-xs text-primary">
              Notice complète
            </button>
          )}
        </div>
      )}
    </>
  );
}
