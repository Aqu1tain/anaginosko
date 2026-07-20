"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../hooks/useAuth";
import {
  fetchAdminStats,
  fetchMyAnnotations,
  deleteAnnotation,
  fetchAdminReports,
  updateReportStatus,
  type AdminStats,
  type Annotation,
  type AdminReport,
  type ReportStatus,
  type ReportCategory,
} from "../lib/api";
import { corpusById, parseRef } from "../data/corpus";
import { textById } from "../data/texts";
import { refHref } from "../data/passageLink";
import AnnotationEditor, { type AnnotationTarget } from "./AnnotationEditor";
import { CATEGORY_LABEL } from "./ReportEditor";
import AdminAnalytics from "./AdminAnalytics";
import Avatar from "./profile/Avatar";

const STATUS_LABEL: Record<ReportStatus, string> = {
  pending: "En attente",
  in_progress: "En cours",
  resolved: "Résolu",
  rejected: "Rejeté",
};
const STATUS_BADGE: Record<ReportStatus, string> = {
  pending: "badge-warning",
  in_progress: "badge-info",
  resolved: "badge-success",
  rejected: "badge-error",
};
const STATUS_ORDER: ReportStatus[] = ["pending", "in_progress", "resolved", "rejected"];
const CATEGORY_ORDER: ReportCategory[] = [
  "traduction",
  "texte",
  "commentaire",
  "definition",
  "demande_note",
];

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrateur",
  philologist: "Philologue",
  reader: "Lecteur",
};

function NavCard({ href, title, desc, icon, avatar }: { href: string; title: string; desc: string; icon?: React.ReactNode; avatar?: React.ReactNode }) {
  return (
    <a
      href={href}
      className="group flex items-start gap-3 rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
    >
      {avatar ?? <span className="rounded-lg bg-primary/10 p-2 text-primary">{icon}</span>}
      <div className="min-w-0">
        <p className="font-semibold group-hover:text-primary">{title}</p>
        <p className="text-xs text-base-content/60">{desc}</p>
      </div>
    </a>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-base-300 bg-base-100 px-4 py-3 shadow-sm">
      <p className={`text-2xl font-bold ${accent ? "text-warning" : ""}`}>{value}</p>
      <p className="text-xs text-base-content/60">{label}</p>
    </div>
  );
}

const ICON = {
  articles: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 4h9l3 3v13H6z" />
      <path d="M9 9h6M9 13h6M9 17h4" />
    </svg>
  ),
  arbitrage: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 8h10M7 12h10M7 16h6" />
      <circle cx="18.5" cy="16.5" r="2.5" />
    </svg>
  ),
};

function locationLabel(ref: string): string {
  if (ref.startsWith("lemma:")) return ref.slice(6);
  if (ref.startsWith("def:")) return ref.slice(4);
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
  if (a.ref.startsWith("def:")) return "définition";
  if (a.ref.startsWith("lemma:")) return "lemme";
  return a.graphemeIndex != null ? "caractère" : a.endWordIndex != null ? "phrase" : "mot";
}

const isDefinition = (a: Annotation) => a.ref.startsWith("def:");

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
  const { user, ready, photo, logout } = useAuth();
  const router = useRouter();
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
  const [tab, setTab] = useState<"annotations" | "definitions" | "analytics" | "reports">(
    "annotations",
  );
  const [query, setQuery] = useState("");
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [reportStatus, setReportStatus] = useState<ReportStatus | "all">("all");
  const [reportCategory, setReportCategory] = useState<ReportCategory | "all">("all");

  // Les définitions Biblion (def:) sont un système à part : onglet dédié, hors
  // de la liste des annotations.
  const defs = useMemo(() => annos.filter(isDefinition), [annos]);
  const plainAnnos = useMemo(() => annos.filter((a) => !isDefinition(a)), [annos]);
  const baseList = tab === "definitions" ? defs : plainAnnos;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return baseList;
    return baseList.filter(
      (a) =>
        a.body.toLowerCase().includes(q) ||
        (a.source ?? "").toLowerCase().includes(q) ||
        locationLabel(a.ref).toLowerCase().includes(q) ||
        (a.author?.displayName ?? "").toLowerCase().includes(q),
    );
  }, [baseList, query]);

  const annosTabLabel = seesAll ? "Annotations" : "Mes annotations";
  const onList = tab === "annotations" || tab === "definitions";
  const noun = tab === "definitions" ? "définition" : "annotation";

  // Signalements filtrés côté client (statut + catégorie + recherche).
  const filteredReports = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reports.filter(
      (r) =>
        (reportStatus === "all" || r.status === reportStatus) &&
        (reportCategory === "all" || r.category === reportCategory) &&
        (!q ||
          r.message.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          (r.ref ? locationLabel(r.ref).toLowerCase().includes(q) : false)),
    );
  }, [reports, reportStatus, reportCategory, query]);

  const reload = () => {
    const jobs: Promise<unknown>[] = [fetchMyAnnotations().then(setAnnos)];
    // Stats non bloquantes : si l'API ne les autorise pas (rôle), on garde le reste.
    if (canViewDashboard) jobs.push(fetchAdminStats().then(setStats).catch(() => setStats(null)));
    // Signalements réservés à admin + philologue.
    if (canEdit) jobs.push(fetchAdminReports().then(setReports).catch(() => setReports([])));
    Promise.all(jobs).catch(() => setError(true));
  };

  const setStatus = async (id: number, status: ReportStatus) => {
    await updateReportStatus(id, status);
    setReports((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
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

  const pendingCount = reports.filter((r) => r.status === "pending").length;
  const sections: { key: "annotations" | "definitions" | "analytics" | "reports"; label: string; badge?: number }[] = [
    { key: "annotations", label: annosTabLabel },
    { key: "definitions", label: "Définitions" },
    { key: "analytics", label: "Fréquentation" },
    ...(canEdit ? [{ key: "reports" as const, label: "Signalements", badge: pendingCount }] : []),
  ];

  return (
    <div className="mx-auto max-w-5xl pb-12 pt-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-base-content/60">
            {user?.displayName}
            {user?.role && (
              <span className="rounded-full bg-base-200 px-2 py-0.5 text-xs font-medium text-base-content/70">
                {ROLE_LABEL[user.role] ?? user.role}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={async () => {
            await logout();
            router.push("/");
          }}
          className="btn btn-ghost btn-sm gap-1.5 text-base-content/70"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <path d="M16 17l5-5-5-5" />
            <path d="M21 12H9" />
          </svg>
          Se déconnecter
        </button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <NavCard href="/mon-profil" title="Mon profil" desc="Photo, bio, liens publics" avatar={<Avatar name={user?.displayName ?? ""} photo={photo} size={40} />} />
        {canEdit && <NavCard href="/admin/articles" title="Articles" desc="Rédiger, relire, publier" icon={ICON.articles} />}
        {canEdit && <NavCard href="/admin/arbitrage" title="Arbitrage LXX" desc="Liens grec et Giguet" icon={ICON.arbitrage} />}
      </div>

      {stats && (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label={seesAll ? "Annotations" : "Mes annotations"} value={plainAnnos.length} />
          <Stat label="Définitions" value={defs.length} />
          {canEdit && <Stat label="Signalements en attente" value={pendingCount} accent={pendingCount > 0} />}
          <Stat label="Vues (total)" value={stats.views} />
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-1 border-b border-base-300">
        {sections.map((s) => (
          <button
            key={s.key}
            onClick={() => setTab(s.key)}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${tab === s.key ? "text-primary" : "text-base-content/60 hover:text-base-content"}`}
          >
            {s.label}
            {s.badge ? <span className="badge badge-warning badge-xs ml-1.5">{s.badge}</span> : null}
            {tab === s.key && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-primary" />}
          </button>
        ))}
      </div>

      {tab === "analytics" && (
        <section className="mt-6">
          {stats ? (
            <AdminAnalytics stats={stats} refLabel={locationLabel} />
          ) : (
            <p className="text-sm text-base-content/70">Statistiques indisponibles.</p>
          )}
        </section>
      )}

      {tab === "reports" && canEdit && (
        <section className="mt-6">
          <div className="flex flex-col gap-2">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Chercher : message, e-mail, emplacement…"
              className="input input-bordered input-sm w-full max-w-md"
              autoComplete="off"
              spellCheck={false}
            />
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setReportStatus("all")}
                className={`btn btn-xs ${reportStatus === "all" ? "btn-primary" : "btn-ghost border border-base-300"}`}
              >
                Tous statuts
              </button>
              {STATUS_ORDER.map((s) => (
                <button
                  key={s}
                  onClick={() => setReportStatus(s)}
                  className={`btn btn-xs ${reportStatus === s ? "btn-primary" : "btn-ghost border border-base-300"}`}
                >
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setReportCategory("all")}
                className={`btn btn-xs ${reportCategory === "all" ? "btn-accent" : "btn-ghost border border-base-300"}`}
              >
                Toutes catégories
              </button>
              {CATEGORY_ORDER.map((c) => (
                <button
                  key={c}
                  onClick={() => setReportCategory(c)}
                  className={`btn btn-xs ${reportCategory === c ? "btn-accent" : "btn-ghost border border-base-300"}`}
                >
                  {CATEGORY_LABEL[c]}
                </button>
              ))}
            </div>
            <span className="text-xs text-base-content/70">
              {filteredReports.length} signalement{filteredReports.length > 1 ? "s" : ""}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2.5">
            {filteredReports.map((r) => (
              <div key={r.id} className="rounded-2xl border border-base-300 bg-base-100 p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="badge badge-sm badge-primary badge-soft">
                    {CATEGORY_LABEL[r.category]}
                  </span>
                  <span className={`badge badge-sm badge-soft ${STATUS_BADGE[r.status]}`}>
                    {STATUS_LABEL[r.status]}
                  </span>
                  {r.ref && (
                    <a href={refHref(r.ref, r.wordIndex)} className="font-medium text-primary hover:underline">
                      {locationLabel(r.ref)}{r.verse != null ? `, v.${r.verse}` : ""}
                    </a>
                  )}
                  {r.createdAt && <span className="text-base-content/60">· {formatDate(r.createdAt)}</span>}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed [overflow-wrap:anywhere]">
                  {r.message}
                </p>
                {r.annotation && (
                  <p className="mt-1.5 rounded-lg border border-base-300 bg-base-200/50 px-2.5 py-1.5 text-xs text-base-content/70">
                    Annotation visée : « {r.annotation.body} »
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <a href={`mailto:${r.email}`} className="text-xs text-base-content/60 hover:underline">
                    {r.email}
                  </a>
                  <div className="flex flex-wrap gap-1">
                    {STATUS_ORDER.filter((s) => s !== r.status && s !== "pending").map((s) => (
                      <button
                        key={s}
                        onClick={() => setStatus(r.id, s)}
                        className={`btn btn-ghost btn-xs ${s === "rejected" ? "text-error" : s === "resolved" ? "text-success" : ""}`}
                      >
                        {STATUS_LABEL[s]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            {filteredReports.length === 0 && (
              <p className="text-sm text-base-content/70">Aucun signalement pour ces filtres.</p>
            )}
          </div>
        </section>
      )}

      {onList && (
        <section className="mt-6">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tab === "definitions" ? "Chercher : lemme, texte, source…" : "Chercher : texte, source, livre, auteur…"}
              className="input input-bordered input-sm w-full max-w-md"
              autoComplete="off"
              spellCheck={false}
            />
            <span className="text-xs text-base-content/70">
              {filtered.length}{query ? ` / ${baseList.length}` : ""} {noun}{filtered.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2.5">
            {filtered.map((a) => (
              <div key={a.id} className="rounded-2xl border border-base-300 bg-base-100 p-4">
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
                      {locationLabel(a.ref)}{a.verse != null ? `, v.${a.verse}` : ""}
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
                {query
                  ? `Aucune ${noun} ne correspond.`
                  : tab === "definitions"
                    ? "Aucune définition pour l’instant. Créez-en une depuis une fiche de lemme."
                    : "Aucune annotation pour l’instant."}
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
