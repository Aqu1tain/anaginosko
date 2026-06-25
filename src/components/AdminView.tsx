"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import {
  fetchAdminStats,
  fetchMyAnnotations,
  deleteAnnotation,
  type AdminStats,
  type Annotation,
} from "../lib/api";
import { BOOK_NAMES } from "../data/nt";
import { textById } from "../data/texts";
import { refHref, parseNtRef } from "../data/passageLink";
import AnnotationEditor, { type AnnotationTarget } from "./AnnotationEditor";

function locationLabel(ref: string): string {
  const nt = parseNtRef(ref);
  if (nt) return `${BOOK_NAMES[nt.book] ?? nt.book} ${nt.chapter}`;
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

const ICONS = {
  eye: "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z M12 9.2a2.8 2.8 0 100 5.6 2.8 2.8 0 000-5.6z",
  note: "M5 3.5h11l3 3V20.5H5z M14 3.5V7h3.5",
  users: "M9 11a3.2 3.2 0 100-6.4A3.2 3.2 0 009 11z M2.5 19.5a6.5 6.5 0 0113 0z M16 11a3 3 0 100-6 M21.5 19.5a6 6 0 00-5-5.9",
};

function Stat({ label, value, path }: { label: string; value: number; path: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-base-300 bg-base-100 px-4 py-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
          <path d={path} />
        </svg>
      </span>
      <span className="min-w-0">
        <span className="block text-xl font-bold leading-none">{value}</span>
        <span className="block truncate text-xs text-base-content/55">{label}</span>
      </span>
    </div>
  );
}

function scopeLabel(a: Annotation): string {
  return a.graphemeIndex != null ? "caractère" : a.endWordIndex != null ? "phrase" : "mot";
}

function targetFromAnnotation(a: Annotation): AnnotationTarget {
  return {
    ref: a.ref,
    verse: a.verse,
    wordIndex: a.wordIndex ?? 0,
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
  const isContributor = isAdmin || user?.role === "philologist";

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [annos, setAnnos] = useState<Annotation[]>([]);
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState<AnnotationTarget | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Annotation | null>(null);

  const reload = () => {
    const jobs: Promise<unknown>[] = [fetchMyAnnotations().then(setAnnos)];
    if (isAdmin) jobs.push(fetchAdminStats().then(setStats));
    Promise.all(jobs).catch(() => setError(true));
  };

  useEffect(() => {
    if (isContributor) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!ready) return null;
  if (!isContributor) {
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

  const maxDay = Math.max(1, ...(stats?.viewsByDay.map((d) => d.views) ?? [1]));

  return (
    <div className="pb-10 pt-6">
      <h1 className="text-2xl font-bold">Tableau de bord</h1>
      <p className="mt-0.5 text-sm text-base-content/55">
        {isAdmin ? "Fréquentation et modération des annotations." : "Gérez vos annotations."}
      </p>

      {isAdmin && stats && (
        <>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Stat label="Visites" value={stats.views} path={ICONS.eye} />
            <Stat label="Annotations" value={stats.annotations} path={ICONS.note} />
            <Stat label="Comptes" value={stats.users} path={ICONS.users} />
          </div>

          {stats.viewsByDay.length > 0 && (
            <section className="mt-6 rounded-2xl border border-base-300 bg-base-100 p-4">
              <h2 className="mb-3 text-sm font-semibold text-base-content/70">Visites · 14 derniers jours</h2>
              <div className="flex items-end gap-1" style={{ height: 90 }}>
                {stats.viewsByDay.map((d, i) => (
                  <div key={d.day ?? i} className="group relative flex-1">
                    <div
                      title={`${d.day ?? "?"} : ${d.views}`}
                      className="w-full rounded-t bg-primary/70 transition-colors group-hover:bg-primary"
                      style={{ height: `${(d.views / maxDay) * 78}px`, minHeight: 3 }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-1 flex justify-between text-[0.65rem] text-base-content/40">
                <span>{stats.viewsByDay[0]?.day?.slice(5) ?? ""}</span>
                <span>max {maxDay}</span>
                <span>{stats.viewsByDay.at(-1)?.day?.slice(5) ?? ""}</span>
              </div>
            </section>
          )}

          {stats.topRefs.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-2 text-sm font-semibold text-base-content/70">Textes les plus lus</h2>
              <div className="grid grid-cols-1 gap-1.5">
                {stats.topRefs.map((r) => (
                  <div key={r.ref} className="flex items-center justify-between gap-2 rounded-xl bg-base-200 px-3 py-2 text-sm">
                    <span className="min-w-0 truncate font-mono text-xs text-base-content/70">{r.ref}</span>
                    <span className="shrink-0 font-semibold">{r.views}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <section className="mt-7">
        <h2 className="mb-2 text-sm font-semibold text-base-content/70">
          {isAdmin ? "Annotations" : "Mes annotations"} · {annos.length}
        </h2>
        <div className="grid grid-cols-1 gap-2">
          {annos.map((a) => (
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
                    <div className="mt-1 text-xs italic text-base-content/55 [overflow-wrap:anywhere]">{a.source}</div>
                  )}
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs text-base-content/45">
                    <a href={refHref(a.ref, a.wordIndex)} className="font-medium text-primary hover:underline">
                      {locationLabel(a.ref)}{a.verse != null ? `, v.${a.verse}` : ""} →
                    </a>
                    <span>· {scopeLabel(a)}</span>
                    {a.createdAt && <span>· {formatDate(a.createdAt)}</span>}
                    {isAdmin && a.author && (
                      <span>· <span className="font-greek">{a.author.displayName}</span></span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <button onClick={() => setEditing(targetFromAnnotation(a))} className="btn btn-ghost btn-xs">
                    Modifier
                  </button>
                  <button onClick={() => setPendingDelete(a)} className="btn btn-ghost btn-xs text-error">
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          ))}
          {annos.length === 0 && (
            <p className="text-sm text-base-content/55">Aucune annotation pour l’instant.</p>
          )}
        </div>
      </section>

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
            <p className="mt-1 line-clamp-3 text-xs text-base-content/55">{pendingDelete.body}</p>
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
