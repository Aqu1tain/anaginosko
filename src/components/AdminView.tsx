"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import {
  fetchAdminStats,
  fetchMyAnnotations,
  deleteAnnotation,
  type AdminStats,
  type Annotation,
} from "../lib/api";
import { corpusById, parseRef } from "../data/corpus";
import { textById } from "../data/texts";
import { refHref } from "../data/passageLink";
import AnnotationEditor, { type AnnotationTarget } from "./AnnotationEditor";
import AdminAnalytics from "./AdminAnalytics";

function locationLabel(ref: string): string {
  if (ref.startsWith("lemma:")) return ref.slice(6);
  const p = parseRef(ref);
  if (p) {
    const names = corpusById(p.corpus).bookNames;
    return `${names[p.book] ?? p.book} ${p.chapter}`;
  }
  return textById(ref)?.reference ?? ref;
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

function scopeLabel(a: Annotation): string {
  if (a.ref.startsWith("lemma:")) return "lemme";
  return a.graphemeIndex != null ? "caractère" : a.endWordIndex != null ? "phrase" : "mot";
}

function targetFromAnnotation(a: Annotation): AnnotationTarget {
  return {
    ref: a.ref,
    verse: a.verse,
    wordIndex: a.wordIndex,
    endWordIndex: a.endWordIndex,
    graphemeIndex: a.graphemeIndex,
    grec: "",
    scopeLabel: scopeLabel(a),
    existing: a,
  };
}

export default function AdminView() {
  const { user, ready } = useAuth();
  const isAdmin = user?.role === "admin";
  const isReader = user?.role === "reader";
  const canEdit = isAdmin || user?.role === "philologist"; // écrire/supprimer (pas reader)
  const seesAll = isAdmin || isReader; // voit toutes les annotations
  const canViewDashboard = canEdit || isReader; // admin, philologue, reader

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [annos, setAnnos] = useState<Annotation[]>([]);
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState<AnnotationTarget | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Annotation | null>(null);
  const [tab, setTab] = useState<"annotations" | "analytics">("annotations");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return annos;
    return annos.filter(
      (a) =>
        a.body.toLowerCase().includes(q) ||
        (a.source ?? "").toLowerCase().includes(q) ||
        locationLabel(a.ref).toLowerCase().includes(q) ||
        (a.author?.displayName ?? "").toLowerCase().includes(q),
    );
  }, [annos, query]);

  const annosTabLabel = seesAll ? "Annotations" : "Mes annotations";

  const reload = () => {
    const jobs: Promise<unknown>[] = [fetchMyAnnotations().then(setAnnos)];
    // Stats non bloquantes : si l'API ne les autorise pas (rôle), on garde le reste.
    if (canViewDashboard) jobs.push(fetchAdminStats().then(setStats).catch(() => setStats(null)));
    Promise.all(jobs).catch(() => setError(true));
  };

  useEffect(() => {
    if (canViewDashboard) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!ready) return null;
  if (!canViewDashboard) {
    return (
      <div className="py-20 text-center text-base-content/70">
        <p>Accès réservé aux contributeurs.</p>
        <a href="/login" className="link link-primary mt-3 inline-block">
          Se connecter
        </a>
      </div>
    );
  }
  if (error) return <p className="py-20 text-center text-base-content/70">Chargement impossible.</p>;

  return (
    <div className="pb-10 pt-6">
      <h1 className="text-2xl font-bold">Tableau de bord</h1>

      <div role="tablist" className="tabs tabs-boxed mt-3 w-fit">
        <button
          role="tab"
          className={`tab ${tab === "annotations" ? "tab-active" : ""}`}
          onClick={() => setTab("annotations")}
        >
          {annosTabLabel}
        </button>
        <button
          role="tab"
          className={`tab ${tab === "analytics" ? "tab-active" : ""}`}
          onClick={() => setTab("analytics")}
        >
          Fréquentation
        </button>
      </div>

      {tab === "analytics" && (
        <section className="mt-5">
          {stats ? (
            <AdminAnalytics stats={stats} refLabel={locationLabel} />
          ) : (
            <p className="text-sm text-base-content/70">Statistiques indisponibles.</p>
          )}
        </section>
      )}

      {tab === "annotations" && (
        <section className="mt-5">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Chercher : texte, source, livre, auteur…"
              className="input input-bordered input-sm w-full max-w-md"
              autoComplete="off"
              spellCheck={false}
            />
            <span className="text-xs text-base-content/70">
              {filtered.length}{query ? ` / ${annos.length}` : ""} annotation{filtered.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2">
            {filtered.map((a) => (
              <div key={a.id} className="rounded-2xl border border-base-300 bg-base-100 p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 break-words">
                  <a
                    href={refHref(a.ref, a.wordIndex)}
                    className="block text-sm leading-relaxed [overflow-wrap:anywhere] hover:text-primary"
                    title="Aller au texte"
                  >
                    {a.body}
                  </a>
                  {a.link ? (
                    <a
                      href={a.link}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="mt-1.5 inline-flex max-w-full items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
                        <path d="M10 14L20 4M20 4h-6M20 4v6" />
                        <path d="M19 14v4a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2h4" />
                      </svg>
                      <span className="min-w-0 truncate">{a.source}</span>
                    </a>
                  ) : (
                    <div className="mt-1 text-xs italic text-base-content/70 [overflow-wrap:anywhere]">{a.source}</div>
                  )}
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs text-base-content/70">
                    <a href={refHref(a.ref, a.wordIndex)} className="font-medium text-primary hover:underline">
                      {locationLabel(a.ref)}{a.verse != null ? `, v.${a.verse}` : ""} →
                    </a>
                    <span>· {scopeLabel(a)}</span>
                    {a.createdAt && <span>· {formatDate(a.createdAt)}</span>}
                    {seesAll && a.author && (
                      <span>· <span className="font-greek">{a.author.displayName}</span></span>
                    )}
                  </div>
                </div>
                {canEdit && (
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <button onClick={() => setEditing(targetFromAnnotation(a))} className="btn btn-ghost btn-xs">
                      Modifier
                    </button>
                    <button onClick={() => setPendingDelete(a)} className="btn btn-ghost btn-xs text-error">
                      Supprimer
                    </button>
                  </div>
                )}
              </div>
            </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-base-content/70">
                {query ? "Aucune annotation ne correspond." : "Aucune annotation pour l’instant."}
              </p>
            )}
          </div>
        </section>
      )}

      {editing && (
        <AnnotationEditor
          target={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}

      {pendingDelete && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={() => setPendingDelete(null)} aria-hidden="true" />
          <div role="dialog" aria-label="Confirmer la suppression" className="relative w-full max-w-xs rounded-2xl border border-base-300 bg-base-100 p-5 shadow-2xl">
            <p className="text-sm">Supprimer cette annotation&nbsp;?</p>
            <p className="mt-1 line-clamp-3 text-xs text-base-content/70">{pendingDelete.body}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setPendingDelete(null)} className="btn btn-ghost btn-sm">
                Annuler
              </button>
              <button
                onClick={async () => {
                  await deleteAnnotation(pendingDelete.id);
                  setPendingDelete(null);
                  reload();
                }}
                className="btn btn-error btn-sm"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
