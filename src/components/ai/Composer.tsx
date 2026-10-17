"use client";

import { useEffect, useRef, type ReactNode } from "react";

// Zone de saisie : grandit avec le texte, Entrée envoie, Maj+Entrée va à la ligne.
export default function Composer({
  value,
  onChange,
  onSend,
  onStop,
  busy,
  placeholder,
  tools,
  autoFocus = false,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onStop: () => void;
  busy: boolean;
  placeholder: string;
  tools?: ReactNode;
  autoFocus?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  }, [value]);

  return (
    <div className="rounded-3xl border border-base-300 bg-base-100 shadow-[0_2px_12px_-4px_rgb(0_0_0/0.12)] transition-colors focus-within:border-base-content/30">
      <textarea
        ref={ref}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            if (!busy) onSend();
          }
        }}
        rows={1}
        placeholder={placeholder}
        className="block max-h-60 w-full resize-none bg-transparent px-5 pt-4 pb-2 leading-relaxed outline-none placeholder:text-base-content/40"
      />
      <div className="flex items-center gap-2 px-3 pb-3">
        <div className="min-w-0 flex-1">{tools}</div>
        {busy ? (
          <button type="button" onClick={onStop} aria-label="Arrêter" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-base-content text-base-100">
            <span className="h-3 w-3 rounded-sm bg-current" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onSend}
            disabled={!value.trim()}
            aria-label="Envoyer"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-primary-content transition-opacity disabled:opacity-30"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
