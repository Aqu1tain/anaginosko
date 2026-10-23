"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/src/hooks/useAuth";
import { apiFetch, can } from "@/src/lib/api";
import { loadBooks, loadChapter, chapterNumbers, type NtBook } from "@/src/data/nt";
import { corpusById } from "@/src/data/corpus";
import type { Mot, Text } from "@/src/data/texts";
import {
  discardDrafts,
  fetchChapterWork,
  fetchTerms,
  reviewDrafts,
  saveDrafts,
  submitDrafts,
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

type PublishedMap = Record<string, Record<string, { maison: string }>>;
type Side = "mot" | "verset" | "controles" | "assistant";
const mod = (e: KeyboardEvent) => e.metaKey || e.ctrlKey;

export default function ChapterWorkbench({ corpus, book, chapter }: { corpus: WorkCorpus; book: string; chapter: number }) {
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
  const submit = (refs: string[]) => act(async () => (await flushAll(), submitDrafts(corpus, book, refs)));
  const approve = (refs: string[]) => act(() => reviewDrafts(corpus, book, refs, "approve"));
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
      submit([row.ref]);
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
  const mine = rows.filter((r) => (r.draft?.status === "draft" || r.draft?.status === "changes") && r.draft.authorId === me).map((r) => r.ref);
  const toReview = rows.filter((r) => r.draft?.status === "review" && r.draft.authorId !== me).map((r) => r.ref);
  const done = rows.filter((r) => r.published).length;
  const meta = books.find((b) => b.id === book);
  const chapters = meta ? chapterNumbers(meta) : [];
  const pos = chapters.indexOf(chapter);
  const href = (ch: number) => `?corpus=${corpus}&book=${book}&ch=${ch}`;
  const activeRow = rows.find((r) => r.ref === active) ?? null;
  const selected = word !== null ? text?.mots?.[word] : null;
  const issues = rows.flatMap((r) => r.issues.map((i) => ({ ref: r.ref, verse: r.verse, ...i })));

  if (error && !text) return <p className="py-12 text-center text-sm text-error">{error}</p>;

  return (
    <div className="pb-12 pt-4">
      <header className="sticky top-14 z-10 -mx-4 mb-2 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-base-300 bg-base-100/95 px-4 py-3 backdrop-blur wide:mx-0 wide:px-0">
        <Link href={`?corpus=${corpus}`} className="text-sm text-base-content/70 hover:text-base-content">
          Atelier
        </Link>
        <h1 className="text-xl font-bold tracking-tight">
          {config.bookNames[book] ?? book} {chapter}
        </h1>
        <span className="flex items-center gap-1">
          {pos > 0 && (
            <Link href={href(chapters[pos - 1])} className="btn btn-ghost btn-xs" aria-label="Chapitre précédent">
              ←
            </Link>
          )}
          {pos >= 0 && pos < chapters.length - 1 && (
            <Link href={href(chapters[pos + 1])} className="btn btn-ghost btn-xs" aria-label="Chapitre suivant">
              →
            </Link>
          )}
        </span>
        <span className="text-sm tabular-nums text-base-content/50">
          {done} / {rows.length} publiés
        </span>
        <span className="ml-auto flex flex-wrap gap-2">
          <GotoPalette corpus={corpus} />
          {done < rows.length && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={nextUntranslated} title="⌘ J">
              Suivant à traduire
            </button>
          )}
          {corpus === "lxx" && (
            <Link href={`?mode=alignement&corpus=lxx&book=${book}&ch=${chapter}`} className="btn btn-ghost btn-sm">
              Alignement Giguet
            </Link>
          )}
          {mine.length > 0 && (
            <button type="button" className="btn btn-outline btn-sm" onClick={() => submit(mine)}>
              Soumettre {mine.length}
            </button>
          )}
          {toReview.length > 0 && (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => approve(toReview)}>
              Valider {toReview.length}
            </button>
          )}
        </span>
      </header>
      {error && <p className="mb-2 text-sm text-error">{error}</p>}

      <div className={`grid gap-8 ${side === "assistant" ? "wide:grid-cols-[minmax(0,1fr)_30rem]" : "wide:grid-cols-[minmax(0,1fr)_22rem]"}`}>
        <ol className="min-w-0">
          {!text || !work ? (
            <p className="py-12 text-center text-sm text-base-content/50">Chargement…</p>
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
                }}
                onKey={onKey(i)}
                onSubmit={() => submit([row.ref])}
                onApprove={() => approve([row.ref])}
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
          <div className="sticky top-32 max-h-[calc(100dvh-9rem)] overflow-y-auto rounded-box border border-base-300 p-4">
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
                  className={`rounded-md px-2.5 py-1 ${side === k ? "bg-base-200 font-medium" : "text-base-content/70 hover:text-base-content"}`}
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
                <p className="text-sm text-base-content/50">Cliquez un mot grec.</p>
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
                <div className="space-y-3 text-sm text-base-content/50">
                  <p>Cliquez dans un verset.</p>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                    <dt className="font-mono">⌘ Entrée</dt>
                    <dd>enregistrer, verset suivant</dd>
                    <dt className="font-mono">⌘ ↑ ↓</dt>
                    <dd>changer de verset</dd>
                    <dt className="font-mono">⌘ ⇧ Entrée</dt>
                    <dd>soumettre à relecture</dd>
                    <dt className="font-mono">⌘ B</dt>
                    <dd>partir de la traduction de base</dd>
                    <dt className="font-mono">⌘ J</dt>
                    <dd>verset suivant à traduire</dd>
                    <dt className="font-mono">⌘ K</dt>
                    <dd>aller à un passage</dd>
                    {assisted && (
                      <>
                        <dt className="font-mono">⌘ I</dt>
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
                <p className="text-sm text-base-content/50">Cliquez dans un verset, puis ⌘ I pour un premier jet.</p>
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
                <p className="text-sm text-base-content/50">Rien à signaler.</p>
              ))}
          </div>
        </aside>
      </div>

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
