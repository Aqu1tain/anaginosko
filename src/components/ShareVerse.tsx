"use client";

import { useEffect, useRef, useState } from "react";
import { loadChapterVerses, sliceVerses } from "./articles/citationText";
import { verseRefLabel } from "../data/refParse";

// Partage d'un verset : lien profond, citation (grec + français + référence + lien)
// et code d'intégration <iframe>. Remplace l'ancien CopyVerseLink (le lien devient
// une action du menu). Popover en position fixed (ancrée au bouton) pour ne jamais
// être rognée par la colonne de lecture. Discret : révélé au survol comme avant.
type Props = { corpus: string; book: string; chapter: number; v: number };

export default function ShareVerse({ corpus, book, chapter, v }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (panelRef.current?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", () => setOpen(false), { once: true });
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const flash = (label: string) => {
    setDone(label);
    setTimeout(() => setDone(null), 1400);
  };

  const toggle = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 6, left: Math.max(8, Math.min(r.left - 120, window.innerWidth - 268)) });
    setOpen((o) => !o);
  };

  const verseUrl = () => `${location.origin}${location.pathname}#v${v}`;

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* presse-papiers indisponible */
    }
    flash(label);
  };

  const copyLink = () => {
    history.replaceState(null, "", `#v${v}`);
    return copy(verseUrl(), "Lien copié");
  };

  const copyCitation = async () => {
    const byVerse = await loadChapterVerses(corpus, book, chapter).catch(() => null);
    const line = byVerse ? sliceVerses(byVerse, v, v)[0] : null;
    const ref = verseRefLabel(corpus, book, chapter, v, v);
    const parts = [line?.greek, line?.french, `— ${ref} · ${verseUrl()}`].filter(Boolean);
    return copy(parts.join("\n"), "Citation copiée");
  };

  const copyEmbed = () => {
    const ref = verseRefLabel(corpus, book, chapter, v, v);
    const src = `${location.origin}/embed/${corpus}/${book}/${chapter}?v=${v}`;
    const code = `<iframe src="${src}" width="480" height="210" style="border:0;max-width:100%" loading="lazy" title="${ref}"></iframe>`;
    return copy(code, "Code copié");
  };

  const item = (label: string, onClick: () => void, flag: string) => (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-base-200"
    >
      {label}
      {done === flag && <span className="text-xs font-medium text-success">Copié</span>}
    </button>
  );

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        aria-label={`Partager le verset ${v}`}
        aria-expanded={open}
        title="Partager ce verset"
        className="btn btn-ghost btn-sm btn-circle text-base-content/50 opacity-70 transition hover:text-primary hover:opacity-100 focus-visible:opacity-100 wide:opacity-0 wide:group-hover:opacity-100"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
        </svg>
      </button>
      {open && pos && (
        <div
          ref={panelRef}
          role="menu"
          style={{ position: "fixed", top: pos.top, left: pos.left, width: 260 }}
          className="z-50 rounded-xl border border-base-300 bg-base-100 p-1.5 text-base-content shadow-xl"
        >
          {item("Copier le lien", copyLink, "Lien copié")}
          {item("Copier la citation", copyCitation, "Citation copiée")}
          {item("Copier le code d’intégration", copyEmbed, "Code copié")}
        </div>
      )}
    </>
  );
}
