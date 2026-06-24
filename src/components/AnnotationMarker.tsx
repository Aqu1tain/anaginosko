import type { Annotation } from "../lib/api";
import { useSafeHover } from "../hooks/useSafeHover";

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
  const { open, setOpen, close, triggerRef, popRef, triggerProps, popProps } = useSafeHover();

  return (
    <span
      ref={triggerRef as React.RefObject<HTMLSpanElement>}
      className="relative inline-block align-super"
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
      {open && (
        <span
          ref={popRef as React.RefObject<HTMLSpanElement>}
          role="note"
          {...popProps}
          className="anno-pop absolute left-1/2 top-full z-50 mt-1.5 block w-72 -translate-x-1/2 rounded-2xl border border-base-300 bg-base-100 p-0 text-left shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {annotations.map((a, i) => (
            <span key={a.id} className={`block p-3.5 font-sans ${i > 0 ? "border-t border-base-300" : ""}`}>
              <span className="block text-sm leading-relaxed text-base-content/90">{a.body}</span>
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
          ))}
        </span>
      )}
    </span>
  );
}
