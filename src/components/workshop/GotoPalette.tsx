"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { NT, LXX } from "@/src/data/corpus";
import type { WorkCorpus } from "@/src/lib/workshopApi";

type Target = { corpus: WorkCorpus; book: string; name: string; chapter: number; verse: number | null };

const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, "");
const BOOKS = [NT, LXX].flatMap((c) => Object.entries(c.bookNames).map(([id, name]) => ({ corpus: c.id as WorkCorpus, id, name, key: fold(name) })));

// Abréviation usuelle : mêmes premiers caractères, puis les lettres dans l'ordre
// (« gn » pour Genèse, « jn » pour Jean, « 1co » pour 1 Corinthiens).
function abbreviates(q: string, name: string): boolean {
  if (!q || q[0] !== name[0]) return false;
  let i = 0;
  for (const ch of name) if (ch === q[i]) i++;
  return i === q.length;
}

// « Jean 3,16 », « jn 3 16 », « 1 Co 13 », « Gn 1 » : livre (nom ou abréviation), chapitre, verset.
function parse(input: string, prefer: WorkCorpus): Target[] {
  const m = input.trim().match(/^((?:[1-4]\s*)?[^\d]+?)\s*(\d+)(?:\s*[,:. ]\s*(\d+))?$/);
  if (!m) return [];
  const q = fold(m[1]);
  const score = (b: (typeof BOOKS)[number]) => (b.key.startsWith(q) || fold(b.id).startsWith(q) ? 2 : abbreviates(q, b.key) ? 1 : 0);
  return BOOKS.filter((b) => score(b) > 0)
    .sort((a, b) => score(b) - score(a) || Number(b.corpus === prefer) - Number(a.corpus === prefer) || a.key.length - b.key.length)
    .slice(0, 6)
    .map((b) => ({ corpus: b.corpus, book: b.id, name: b.name, chapter: Number(m[2]), verse: m[3] ? Number(m[3]) : null }));
}

// Palette ⌘K : aller à un passage de l'atelier, dans le NT comme dans la Septante.
export default function GotoPalette({ corpus }: { corpus: WorkCorpus }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const targets = useMemo(() => parse(q, corpus), [q, corpus]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (open) {
      setQ("");
      setTimeout(() => input.current?.focus(), 0);
    }
  }, [open]);

  const go = (t: Target) => {
    setOpen(false);
    router.push(`?corpus=${t.corpus}&book=${t.book}&ch=${t.chapter}${t.verse ? `#v${t.verse}` : ""}`);
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn btn-ghost btn-sm gap-2 text-base-content/70">
        Aller à…
        <kbd className="kbd kbd-xs">⌘K</kbd>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-base-content/30 p-4 pt-[15vh]" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md overflow-hidden rounded-box bg-base-100 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <input
              ref={input}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && targets[0] && go(targets[0])}
              placeholder="Jean 3,16 · Gn 1 · 1 Co 13"
              className="w-full border-b border-base-300 bg-transparent px-4 py-3 text-lg outline-none"
            />
            <ul>
              {targets.map((t, i) => (
                <li key={`${t.corpus}${t.book}`}>
                  <button type="button" onClick={() => go(t)} className={`flex w-full justify-between px-4 py-2.5 text-left text-sm hover:bg-base-200 ${i === 0 ? "bg-base-200/60" : ""}`}>
                    <span>
                      {t.name} {t.chapter}
                      {t.verse ? `,${t.verse}` : ""}
                    </span>
                    <span className="text-xs text-base-content/50">{t.corpus === "nt" ? "NT" : "Septante"}</span>
                  </button>
                </li>
              ))}
              {q && !targets.length && <li className="px-4 py-3 text-sm text-base-content/50">Aucun livre.</li>}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
