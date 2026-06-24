import { useState } from "react";
import type { Annotation } from "../lib/api";

export default function AnnotationMarker({ annotations }: { annotations: Annotation[] }) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className="relative inline-block align-super"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label="Annotation"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="font-sans text-[0.62em] font-bold text-accent"
      >
        ⓘ
      </button>
      {open && (
        <span
          role="note"
          className="absolute left-1/2 top-full z-40 mt-1 block w-64 -translate-x-1/2 rounded-box border border-base-300 bg-base-100 p-3 text-left shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {annotations.map((a, i) => (
            <span key={a.id} className={`block font-sans ${i > 0 ? "mt-2 border-t border-base-300 pt-2" : ""}`}>
              <span className="block text-sm leading-snug text-base-content/90">{a.body}</span>
              <span className="mt-1 block text-xs italic text-base-content/60">{a.source}</span>
              {a.author && (
                <span className="mt-1 block text-right text-xs text-base-content/45">
                  <span className="font-greek">{a.author.displayName}</span>
                </span>
              )}
            </span>
          ))}
        </span>
      )}
    </span>
  );
}
