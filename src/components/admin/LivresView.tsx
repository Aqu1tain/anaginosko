"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/src/hooks/useAuth";
import { can, getToken } from "@/src/lib/api";
import { NT, LXX, type CorpusConfig } from "@/src/data/corpus";

type IntroStatus = { corpus: string; book: string; published: boolean };

export default function LivresView() {
  const { user, ready } = useAuth();
  const canManage = can(user, "review");
  const [statuses, setStatuses] = useState<Map<string, boolean>>(new Map());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canManage) return;
    const token = getToken();
    fetch("/admin/livres/api", { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Chargement impossible."))))
      .then((d: { intros: IntroStatus[] }) => setStatuses(new Map(d.intros.map((i) => [`${i.corpus}-${i.book}`, i.published]))))
      .catch((e) => setError((e as Error).message));
  }, [canManage]);

  if (!ready) return null;
  if (!canManage)
    return (
      <div className="py-20 text-center text-base-content/70">
        <p>Réservé aux éditeurs.</p>
        <a href="/login" className="link link-primary mt-3 inline-block">Se connecter</a>
      </div>
    );

  const section = (corpus: CorpusConfig) => (
    <section className="mt-6">
      <h2 className="text-sm font-semibold text-base-content/70">{corpus.label}</h2>
      <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
        {corpus.bookOrder.map((book) => {
          const key = `${corpus.id}-${book}`;
          const published = statuses.get(key);
          const state = published === undefined ? null : published ? "Publiée" : "Brouillon";
          return (
            <Link
              key={book}
              href={`/admin/livres/${corpus.id}/${book}`}
              className="flex items-center justify-between gap-2 rounded-lg border border-base-300 bg-base-100 px-3 py-2 text-sm transition-colors hover:border-primary/40"
            >
              <span className="truncate">{corpus.bookNames[book] ?? book}</span>
              {state && (
                <span className={`badge badge-xs ${published ? "badge-success badge-soft" : "badge-ghost"}`}>{state}</span>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );

  return (
    <div className="mx-auto max-w-3xl pb-16 pt-8">
      <h1 className="text-3xl font-bold tracking-tight">Introductions de livres</h1>
      <p className="mt-1 text-sm text-base-content/60">
        Rédigez une présentation éditoriale par livre (auteur, thème, particularités). Elle s'affiche en tête de la page du livre et améliore son référencement.
      </p>
      {error && <div className="alert alert-error mt-4 text-sm">{error}</div>}
      {section(NT)}
      {section(LXX)}
    </div>
  );
}
