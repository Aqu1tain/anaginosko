"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/src/hooks/useAuth";
import { apiFetch, can } from "@/src/lib/api";
import { loadBooks, loadChapter, chapterNumbers, type NtBook } from "@/src/data/nt";
import { corpusById, type ChapterId } from "@/src/data/corpus";
import type { Mot, Text } from "@/src/data/texts";
import {
  discardDrafts,
  fetchChapterWork,
  fetchTerms,
  reviewDrafts,
  saveDrafts,
  type ChapterWork,
  type KeyTerm,
  type WorkCorpus,
} from "@/src/lib/workshopApi";
import VerseRow, { type RowState } from "./VerseRow";
import WordPanel from "./WordPanel";
import VerseSide from "./VerseSide";
import { checkVerse } from "./checks";
import GotoPalette from "./GotoPalette";
import AssistantPanel, { useVerseDrafts } from "./assistant/AssistantPanel";
import { newChat } from "./assistant/AssistantChat";
import Chevron from "@/src/components/Chevron";

type PublishedMap = Record<string, Record<string, { maison: string }>>;
type Side = "mot" | "verset" | "controles" | "assistant";
const mod = (e: KeyboardEvent) => e.metaKey || e.ctrlKey;

const quiet = "btn btn-sm border-base-300 bg-base-100 font-medium shadow-none hover:bg-base-200";

function ChapterStep({ to, href, label }: { to: "left" | "right"; href: string | null; label: string }) {
  if (!href) return <span className="w-11" aria-hidden="true" />;
  return (
    <Link href={href} aria-label={label} className="btn btn-ghost btn-square h-11 w-11">
      <Chevron to={to} />
    </Link>
  );
}

function Keys({ k }: { k: string }) {
  return (
    <span className="flex gap-1">
      {k.split(" ").map((key) => (
        <kbd key={key} className="kbd kbd-xs">
          {key}
        </kbd>
      ))}
    </span>
  );
}

export default function ChapterWorkbench({ corpus, book, chapter }: { corpus: WorkCorpus; book: string; chapter: ChapterId }) {
  const config = corpusById(corpus);
  const { user } = useAuth();
  const [text, setText] = useState<Text | null>(null);
  const [books, setBooks] = useState<NtBook[]>([]);
  const [work, setWork] = useState<ChapterWork | null>(null);
  const [terms, setTerms] = useState<Map<string, KeyTerm>>(new Map());
  const [published, setPublished] = useState<PublishedMap>({});
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<string | null>(null);
  const [word, setWord] = useState<number | null>(null);
  const [side, setSide] = useState<Side>("verset");
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    if (!drawer) return;
    const close = (e: globalThis.KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [drawer]);
  const [noteFor, setNoteFor] = useState<string[] | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const assisted = can(user, "ai");
  const { drafts: proposals, run: propose } = useVerseDrafts(corpus, book, chapter);
  const [chat] = useState(newChat);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const editsRef = useRef(edits);
  editsRef.current = edits;

  const reloadWork = useCallback(() => fetchChapterWork(corpus, book, chapter).then(setWork), [corpus, book, chapter]);
  const reloadTerms = useCallback(() => fetchTerms().then((t) => setTerms(new Map(t.map((x) => [x.lemma, x])))), []);
  const reloadPublished = useCallback(
    () => apiFetch<{ translations: PublishedMap }>(`/translations?corpus=${corpus}`).then((d) => setPublished(d.translations)),
    [corpus],
  );

  useEffect(() => {
    setText(null);
    setEdits({});
    setActive(null);
    setWord(null);
    loadChapter(book, chapter, config).then(setText).catch(() => setError("Chapitre introuvable."));
    loadBooks(config).then(setBooks).catch(() => {});
    reloadWork().catch((e) => setError(e.message));
    reloadTerms().catch(() => {});
    reloadPublished().catch(() => {});
  }, [book, chapter, config, reloadWork, reloadTerms, reloadPublished]);

  const rows: RowState[] = useMemo(() => {
    if (!text || !work) return [];
    const byVerse = new Map<number, { mot: Mot; index: number }[]>();
    (text.mots ?? []).forEach((mot, index) => {
      if (mot.verse === null) return;
      if (!byVerse.has(mot.verse)) byVerse.set(mot.verse, []);
      byVerse.get(mot.verse)!.push({ mot, index });
    });
    return [...byVerse].map(([verse, words]) => {
      const ref = `${chapter}:${verse}`;
      const draft = work.drafts[ref];
      const pub = work.published[ref];
      const value = edits[ref] ?? (draft ? (draft.text ?? "") : (pub?.text ?? ""));
      return {
        ref,
        verse,
        words,
        base: text.francais?.[String(verse)] ?? null,
        published: pub,
        draft,
        value,
        saving: saving.has(ref),
        issues: checkVerse(value, words.map((w) => w.mot.lemme ?? ""), terms),
        comments: (work.comments[ref] ?? []).filter((c) => !c.resolved).length,
      };
    });
  }, [text, work, edits, saving, terms, chapter]);

  const persist = useCallback(
    async (ref: string) => {
      clearTimeout(timers.current[ref]);
      const value = editsRef.current[ref];
      if (value === undefined || !work) return;
      const row = rows.find((r) => r.ref === ref);
      setSaving((s) => new Set(s).add(ref));
      try {
        if (value.trim()) await saveDrafts(corpus, book, [{ ref, text: value.trim() }]);
        else if (row?.published) await saveDrafts(corpus, book, [{ ref, text: null }]);
        else if (row?.draft) await discardDrafts(corpus, book, [ref]);
        await reloadWork();
        setEdits((e) => {
          if (e[ref] !== value) return e;
          const rest = { ...e };
          delete rest[ref];
          return rest;
        });
      } catch (e) {
        setError((e as Error).message);
      }
      setSaving((s) => {
        const next = new Set(s);
        next.delete(ref);
        return next;
      });
    },
    [corpus, book, work, rows, reloadWork],
  );

  const change = (ref: string, value: string) => {
    setEdits((e) => ({ ...e, [ref]: value }));
    clearTimeout(timers.current[ref]);
    timers.current[ref] = setTimeout(() => persist(ref), 1200);
  };

  // Arrivée sur « #v12 » (palette, vérifications, activité) : aller au verset.
  const landed = useRef(false);
  useEffect(() => {
    if (landed.current || !rows.length) return;
    landed.current = true;
    const v = Number(window.location.hash.replace("#v", ""));
    const target = rows.find((r) => r.verse === v);
    if (!target) return;
    document.getElementById(`v${v}`)?.scrollIntoView({ block: "center" });
    document.querySelector<HTMLTextAreaElement>(`textarea[data-ref="${target.ref}"]`)?.focus({ preventScroll: true });
  }, [rows]);

  const focusAt = (index: number) => {
    const target = rows[Math.max(0, Math.min(rows.length - 1, index))];
    if (target) document.querySelector<HTMLTextAreaElement>(`textarea[data-ref="${target.ref}"]`)?.focus();
  };

  const act = async (job: () => Promise<unknown>) => {
    setError("");
    try {
      await job();
      await Promise.all([reloadWork(), reloadPublished()]);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const flushAll = () => Promise.all(Object.keys(editsRef.current).map(persist));
  const publish = (refs: string[]) => act(async () => (await flushAll(), reviewDrafts(corpus, book, refs, "approve")));
  const discard = (ref: string) =>
    act(async () => {
      clearTimeout(timers.current[ref]);
      setEdits((e) => {
        const rest = { ...e };
        delete rest[ref];
        return rest;
      });
      await discardDrafts(corpus, book, [ref]);
    });

  // Prochain verset sans traduction ni version de travail, après le verset actif.
  const nextUntranslated = () => {
    const from = rows.findIndex((r) => r.ref === active);
    const order = [...rows.slice(from + 1), ...rows.slice(0, from + 1)];
    const target = order.find((r) => !r.published && !r.draft && !r.value.trim());
    if (target) {
      document.getElementById(`v${target.verse}`)?.scrollIntoView({ block: "center" });
      focusAt(rows.indexOf(target));
    }
  };

  const onKey = (i: number) => (e: KeyboardEvent<HTMLTextAreaElement>) => {
    const row = rows[i];
    if (mod(e) && e.key.toLowerCase() === "j") {
      e.preventDefault();
      nextUntranslated();
    } else if (mod(e) && e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      publish([row.ref]);
    } else if (mod(e) && e.key === "Enter") {
      e.preventDefault();
      persist(row.ref);
      focusAt(i + 1);
    } else if (mod(e) && e.key === "ArrowDown") {
      e.preventDefault();
      focusAt(i + 1);
    } else if (mod(e) && e.key === "ArrowUp") {
      e.preventDefault();
      focusAt(i - 1);
    } else if (assisted && mod(e) && e.key.toLowerCase() === "i") {
      e.preventDefault();
      setSide("assistant");
      propose(row.verse);
    } else if (mod(e) && e.key.toLowerCase() === "b" && row.base && !row.value.trim()) {
      e.preventDefault();
      change(row.ref, row.base);
    }
  };

  const me = user?.id;
  const publishable = rows.filter((r) => r.draft && (r.draft.authorId === me || r.draft.status === "review")).map((r) => r.ref);
  const done = rows.filter((r) => r.published).length;
  const meta = books.find((b) => b.id === book);
  const chapters = meta ? chapterNumbers(meta) : [];
  const pos = chapters.indexOf(chapter);
  const href = (ch: ChapterId) => `?corpus=${corpus}&book=${book}&ch=${ch}`;
  const activeRow = rows.find((r) => r.ref === active) ?? null;
  const selected = word !== null ? text?.mots?.[word] : null;
  const issues = rows.flatMap((r) => r.issues.map((i) => ({ ref: r.ref, verse: r.verse, ...i })));

  if (error && !text) return <p className="py-12 text-center text-sm text-error">{error}</p>;

  const panel = (
    <>
    <nav className="mb-4 flex gap-1 text-sm" aria-label="Panneau">
      {(
        [
          ["mot", "Mot"],
          ["verset", "Verset"],
          ["controles", `Contrôles${issues.length ? ` (${issues.length})` : ""}`],
          ...(assisted ? [["assistant", "Assistant"]] : []),
        ] as [Side, string][]
      ).map(([k, label]) => (
        <button
          key={k}
          type="button"
          onClick={() => setSide(k)}
          className={`rounded-md px-2.5 py-1 ${side === k ? "bg-base-200 font-medium" : "text-base-content/80 hover:text-base-content"}`}
        >
          {label}
        </button>
      ))}
    </nav>
    {side === "mot" &&
      (selected?.lemme ? (
        <WordPanel
          key={`${selected.lemme}:${JSON.stringify(terms.get(selected.lemme) ?? null)}`}
          corpus={corpus}
          mot={selected}
          term={terms.get(selected.lemme)}
          published={published}
          onTermSaved={reloadTerms}
        />
      ) : (
        <p className="text-sm text-base-content/70">Cliquez un mot grec.</p>
      ))}
    {side === "verset" &&
      (activeRow && work ? (
        <VerseSide
          key={activeRow.ref}
          corpus={corpus}
          book={book}
          verseRef={activeRow.ref}
          comments={work.comments[activeRow.ref] ?? []}
          onChanged={reloadWork}
          current={activeRow.value}
          onRestore={(t) => change(activeRow.ref, t)}
        />
      ) : (
        <div className="space-y-3 text-sm text-base-content/70">
          <p>Cliquez dans un verset.</p>
          <dl className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 text-xs">
            <dt><Keys k="⌘ Entrée" /></dt>
            <dd>enregistrer, verset suivant</dd>
            <dt><Keys k="⌘ ↑ ↓" /></dt>
            <dd>changer de verset</dd>
            <dt><Keys k="⌘ ⇧ Entrée" /></dt>
            <dd>publier le verset</dd>
            <dt><Keys k="⌘ B" /></dt>
            <dd>partir de la traduction de base</dd>
            <dt><Keys k="⌘ J" /></dt>
            <dd>verset suivant à traduire</dd>
            <dt><Keys k="⌘ K" /></dt>
            <dd>aller à un passage</dd>
            {assisted && (
              <>
                <dt><Keys k="⌘ I" /></dt>
                <dd>premier jet de l’assistant</dd>
              </>
            )}
          </dl>
        </div>
      ))}
    {side === "assistant" &&
      (activeRow ? (
        <AssistantPanel
          chat={chat}
          target={{ corpus, book, chapter, verse: activeRow.verse }}
          current={activeRow.value}
          state={proposals[activeRow.ref]}
          onRun={() => propose(activeRow.verse)}
          onUse={(t) => change(activeRow.ref, t)}
        />
      ) : (
        <p className="text-sm text-base-content/70">Cliquez dans un verset, puis ⌘ I.</p>
      ))}
    {side === "controles" &&
      (issues.length ? (
        <ul className="space-y-2 text-sm">
          {issues.map((i) => (
            <li key={`${i.ref}-${i.message}`}>
              <button type="button" onClick={() => focusAt(rows.findIndex((r) => r.ref === i.ref))} className="text-left hover:text-primary">
                <span className="font-semibold tabular-nums">{i.verse}</span> · {i.message}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-base-content/70">Rien à signaler.</p>
      ))}
    </>
  );

  return (
    <div className="pb-12 pt-4">
      <header className="sticky top-14 z-10 -mx-4 mb-2 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-base-300 bg-base-100/95 px-4 py-2 backdrop-blur wide:mx-0 wide:px-0">
        <span className="flex items-center gap-1">
          <Link href={`?corpus=${corpus}`} className="inline-flex min-h-11 items-center pr-1 text-sm text-base-content/80 transition-colors hover:text-base-content">
            Atelier
          </Link>
          <span className="text-base-content/40" aria-hidden="true">
            /
          </span>
          <ChapterStep to="left" href={pos > 0 ? href(chapters[pos - 1]) : null} label="Chapitre précédent" />
          <h1 className="px-1 text-xl font-bold tracking-tight">
            {config.bookNames[book] ?? book} {chapter}
          </h1>
          <ChapterStep to="right" href={pos >= 0 && pos < chapters.length - 1 ? href(chapters[pos + 1]) : null} label="Chapitre suivant" />
        </span>
        <span className="flex items-center gap-2 text-sm tabular-nums text-base-content/70">
          <span className="h-1.5 w-20 overflow-hidden rounded-full bg-base-200" aria-hidden="true">
            <span className="block h-full bg-success" style={{ width: `${rows.length ? (done / rows.length) * 100 : 0}%` }} />
          </span>
          {done} / {rows.length} publiés
        </span>
        <span className="ml-auto flex flex-wrap items-center gap-2">
          <button type="button" className={`${quiet} wide:hidden`} onClick={() => setDrawer(true)}>
            Panneau
          </button>
          <GotoPalette corpus={corpus} />
          {corpus === "lxx" && (
            <Link href={`?mode=alignement&corpus=lxx&book=${book}&ch=${chapter}`} className="btn btn-ghost btn-sm hidden wide:inline-flex">
              Alignement Giguet
            </Link>
          )}
          {done < rows.length && (
            <button type="button" className={`${quiet} gap-2`} onClick={nextUntranslated}>
              Suivant à traduire
              <kbd className="kbd kbd-xs hidden wide:inline-flex">⌘J</kbd>
            </button>
          )}
          {publishable.length > 0 && (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => publish(publishable)}>
              Publier {publishable.length}
            </button>
          )}
        </span>
      </header>
      {error && <p className="mb-2 text-sm text-error">{error}</p>}

      <div className={`grid gap-8 ${side === "assistant" ? "wide:grid-cols-[minmax(0,1fr)_30rem]" : "wide:grid-cols-[minmax(0,1fr)_22rem]"}`}>
        <ol className="min-w-0">
          {!text || !work ? (
            <p className="py-12 text-center text-sm text-base-content/70">Chargement…</p>
          ) : (
            rows.map((row, i) => (
              <VerseRow
                key={row.ref}
                row={row}
                active={active === row.ref}
                selectedWord={word}
                me={me}
                onFocus={() => {
                  setActive(row.ref);
                  if (side === "mot" && word === null) setSide("verset");
                }}
                onChange={(v) => change(row.ref, v)}
                onWord={(index) => {
                  setWord(index);
                  setActive(row.ref);
                  setSide("mot");
                  setDrawer(true);
                }}
                onKey={onKey(i)}
                onPublish={() => publish([row.ref])}
                onRequestChanges={() => {
                  setNoteFor([row.ref]);
                  setNote("");
                }}
                onDiscard={() => discard(row.ref)}
              />
            ))
          )}
        </ol>

        <aside className="hidden wide:block">
          <div className="sticky top-32 max-h-[calc(100dvh-9rem)] overflow-y-auto rounded-box border border-base-300 p-4">{panel}</div>
        </aside>
      </div>

      {drawer && (
        <div className="fixed inset-0 z-50 wide:hidden" onClick={() => setDrawer(false)}>
          <div className="absolute inset-0 bg-base-content/30" />
          <div
            role="dialog"
            aria-label="Panneau"
            className="absolute inset-x-0 bottom-0 max-h-[75dvh] overflow-y-auto rounded-t-box bg-base-100 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="-mt-1 mb-1 flex justify-end">
              <button type="button" aria-label="Fermer" className="btn btn-ghost btn-square" onClick={() => setDrawer(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            {panel}
          </div>
        </div>
      )}

      {noteFor && (
        <dialog open className="modal modal-open">
          <div className="modal-box max-w-md">
            <h2 className="text-lg font-semibold">Demander des corrections</h2>
            <textarea autoFocus value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="textarea textarea-bordered mt-3 w-full" placeholder="Ce qu’il faut revoir" />
            <div className="modal-action">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setNoteFor(null)}>
                Annuler
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={!note.trim()}
                onClick={() => {
                  const refs = noteFor;
                  setNoteFor(null);
                  act(() => reviewDrafts(corpus, book, refs, "changes", note.trim()));
                }}
              >
                Envoyer
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}
