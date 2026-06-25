"use client";

import { createPortal } from "react-dom";
import type { Annotation } from "../lib/api";
import { useSafeHover } from "../hooks/useSafeHover";
import { useIsWide } from "../hooks/useIsWide";

export default function AnnotationMarker({
  annotations,
  canManage,
  onEdit,
  onDelete,
}: {
  annotations: Annotation[];
  canManage?: (a: Annotation) => boolean;
  onEdit?: (a: Annotation) => void;
  onDelete?: (a: Annotation) => void;
}) {
  const wide = useIsWide();
  const { open, setOpen, close, triggerRef, popRef, triggerProps, popProps } = useSafeHover({
    guard: wide,
  });

  const items = annotations.map((a, i) => (
    <span key={a.id} className={`block p-3.5 font-sans ${i > 0 ? "border-t border-base-300" : ""}`}>
      <span className="block whitespace-pre-wrap text-sm leading-relaxed text-base-content/90">{a.body}</span>
      {a.link ? (
        <a
          href={a.link}
          target="_blank"
          rel="noreferrer noopener"
          onClick={(e) => e.stopPropagation()}
          className="mt-2 inline-flex max-w-full items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
            <path d="M10 14L20 4M20 4h-6M20 4v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M19 14v4a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="truncate">{a.source}</span>
        </a>
      ) : (
        <span className="mt-2 block text-xs italic text-base-content/55">{a.source}</span>
      )}
      <span className="mt-2 flex items-center justify-between gap-2">
        {a.author ? (
          <span className="text-xs text-base-content/45">
            <span className="font-greek">{a.author.displayName}</span>
          </span>
        ) : (
          <span />
        )}
        {canManage?.(a) && (
          <span className="flex gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                close();
                onEdit?.(a);
              }}
              className="btn btn-ghost btn-xs"
            >
              Modifier
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                close();
                onDelete?.(a);
              }}
              className="btn btn-ghost btn-xs text-error"
            >
              Supprimer
            </button>
          </span>
        )}
      </span>
    </span>
  ));

  return (
    <span
      ref={triggerRef as React.RefObject<HTMLSpanElement>}
      className="anno-mark relative inline-block"
      {...triggerProps}
    >
      <button
        type="button"
        aria-label="Annotation"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="anno-dot"
      >
        {annotations.length > 1 ? annotations.length : "i"}
      </button>

      {open && wide && (
        <span
          ref={popRef as React.RefObject<HTMLSpanElement>}
          role="note"
          {...popProps}
          className="anno-pop absolute left-1/2 top-full z-50 mt-1.5 block max-h-[60vh] w-72 -translate-x-1/2 overflow-y-auto rounded-2xl border border-base-300 bg-base-100 p-0 text-left shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {items}
        </span>
      )}

      {open && !wide &&
        createPortal(
          <div className="fixed inset-0 z-[70] flex items-end" onClick={(e) => e.stopPropagation()}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={close} aria-hidden="true" />
            <div
              role="note"
              className="animate-sheet relative max-h-[82vh] w-full overflow-y-auto overscroll-contain rounded-t-2xl border-t border-base-300 bg-base-100 pb-[env(safe-area-inset-bottom)] text-left shadow-2xl"
            >
              <div className="sticky top-0 flex items-center justify-between border-b border-base-300 bg-base-100/95 px-4 py-2.5 backdrop-blur-md">
                <span className="text-sm font-semibold">
                  {annotations.length > 1 ? `${annotations.length} annotations` : "Annotation"}
                </span>
                <button onClick={close} aria-label="Fermer" className="btn btn-ghost btn-sm btn-circle">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              {items}
            </div>
          </div>,
          document.body,
        )}
    </span>
  );
}
