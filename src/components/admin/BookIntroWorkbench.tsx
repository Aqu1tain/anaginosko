"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useAuth } from "@/src/hooks/useAuth";
import { can } from "@/src/lib/api";
import { corpusById } from "@/src/data/corpus";
import { fetchBookIntro, saveBookIntro, uploadBookIntroImage } from "@/src/lib/bookIntrosApi";

// Éditeur BlockNote côté admin uniquement (dynamic ssr:false) : pas de fuite dans le
// bundle public des pages de livre.
const ArticleEditor = dynamic(() => import("@/src/components/articles/ArticleEditor"), { ssr: false });

function useIsDark(): boolean {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const read = () => setDark((document.documentElement.getAttribute("data-theme") || "").includes("dark"));
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

type SaveState = "idle" | "saving" | "saved" | "error";

export default function BookIntroWorkbench({ corpus, book }: { corpus: string; book: string }) {
  const { user, ready } = useAuth();
  const dark = useIsDark();
  const bookName = corpusById(corpus).bookNames[book] ?? book;

  const [content, setContent] = useState<unknown[] | null>(null); // null = chargement
  const [published, setPublished] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pending = useRef<unknown[] | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchBookIntro(corpus, book)
      .then((i) => {
        setContent(i?.content ?? []);
        setPublished(!!i?.published);
      })
      .catch((e) => setError((e as Error).message));
  }, [corpus, book]);

  const flush = useCallback(async () => {
    const c = pending.current;
    pending.current = null;
    if (!c) return;
    try {
      await saveBookIntro(corpus, book, { content: c });
      setSaveState("saved");
    } catch (e) {
      setError((e as Error).message);
      setSaveState("error");
    }
  }, [corpus, book]);

  const queueSave = useCallback(
    (blocks: unknown[]) => {
      pending.current = blocks;
      setSaveState("saving");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, 1500);
    },
    [flush],
  );

  // Pousse ce qui reste en attente à la fermeture de l'onglet et au démontage.
  useEffect(() => {
    const onHide = () => {
      if (timer.current) clearTimeout(timer.current);
      flush();
    };
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      flush();
    };
  }, [flush]);

  const togglePublish = async () => {
    setBusy(true);
    setError(null);
    if (timer.current) clearTimeout(timer.current);
    await flush(); // publier reflète le dernier contenu
    try {
      const next = !published;
      await saveBookIntro(corpus, book, { published: next });
      setPublished(next);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!ready) return null;
  if (!can(user, "review"))
    return (
      <div className="py-20 text-center text-base-content/70">
        <p>Réservé aux éditeurs.</p>
        <a href="/login" className="link link-primary mt-3 inline-block">Se connecter</a>
      </div>
    );
  if (content === null) return <div className="py-20 text-center text-base-content/60">Chargement…</div>;

  return (
    <div className="mx-auto max-w-3xl pb-20 pt-6">
      <Link href="/admin/livres" className="link text-sm text-base-content/60">← Introductions de livres</Link>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Introduction · {bookName}</h1>
          <p className="mt-0.5 h-4 text-xs text-base-content/55">
            {saveState === "saving" ? "Enregistrement…" : saveState === "saved" ? "Enregistré" : saveState === "error" ? "Erreur d'enregistrement" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`badge badge-sm ${published ? "badge-success badge-soft" : "badge-ghost"}`}>
            {published ? "Publiée" : "Brouillon"}
          </span>
          <button onClick={togglePublish} disabled={busy} className={`btn btn-sm ${published ? "btn-outline border-base-300" : "btn-primary"}`}>
            {busy ? "…" : published ? "Dépublier" : "Publier"}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error mt-3 text-sm">{error}</div>}

      <div className="article-editor relative mt-6">
        <ArticleEditor
          articleId={`${corpus}-${book}`}
          initialContent={content}
          editable
          dark={dark}
          onChange={queueSave}
          upload={(blob) => uploadBookIntroImage(corpus, book, blob)}
        />
      </div>

      {published && (
        <Link href={`/${corpus}/${book}`} target="_blank" rel="noreferrer" className="link link-primary mt-6 inline-block text-sm">
          Voir la page du livre →
        </Link>
      )}
    </div>
  );
}
