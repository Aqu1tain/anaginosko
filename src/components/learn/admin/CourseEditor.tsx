"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/src/hooks/useAuth";
import { can } from "@/src/lib/api";
import { createArticle } from "@/src/lib/articlesApi";
import { deleteCourse, fetchCourses, lessonsAction, saveCourse, type LessonsAction } from "@/src/lib/coursesApi";
import { COURSE_LEVELS, type CourseLevel } from "@/src/data/courseLevels";
import type { ArticleSummary } from "@/lib/articles";
import type { Course, CourseSection } from "@/lib/courses";

const move = <T,>(list: T[], from: number, to: number): T[] => {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

function LessonStatus({ a }: { a?: ArticleSummary }) {
  if (!a) return <span className="badge badge-sm badge-error badge-soft">Introuvable</span>;
  if (a.hasPublishedVersion) return <span className="badge badge-sm badge-success badge-soft">Publiée</span>;
  if (a.status === "approved") return <span className="badge badge-sm badge-info badge-soft">Approuvée</span>;
  if (a.status === "in_review") return <span className="badge badge-sm badge-warning badge-soft">En relecture</span>;
  return <span className="badge badge-sm badge-ghost">Brouillon</span>;
}

const iconBtn = "btn btn-ghost btn-xs btn-square";

export default function CourseEditor({ id }: { id: string }) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const allowed = can(user, "courses");
  const [course, setCourse] = useState<Course | null>(null);
  const [others, setOthers] = useState<Course[]>([]);
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = () =>
    fetchCourses()
      .then((d) => {
        setCourse(d.courses.find((c) => c.id === id) ?? null);
        setOthers(d.courses.filter((c) => c.id !== id));
        setArticles(d.articles);
      })
      .catch((e) => setError(e.message));
  useEffect(() => {
    if (allowed) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, id]);

  const byId = useMemo(() => new Map(articles.map((a) => [a.id, a])), [articles]);
  // Un article ne se range que dans un seul cours.
  const free = useMemo(() => {
    const used = new Set([...others, ...(course ? [course] : [])].flatMap((c) => c.sections.flatMap((s) => s.lessons)));
    return articles.filter((a) => !used.has(a.id) && a.status !== "archived");
  }, [articles, others, course]);

  if (!ready) return null;
  if (!allowed) return <p className="py-16 text-center text-base-content/70">Réservé à l’équipe des cours.</p>;
  if (!course) return <p className="py-16 text-center text-base-content/70">{error ?? "Chargement…"}</p>;

  const edit = (patch: Partial<Course>) => {
    setCourse({ ...course, ...patch });
    setDirty(true);
    setSaved(false);
  };
  const setSections = (sections: CourseSection[]) => edit({ sections });
  const setSection = (i: number, patch: Partial<CourseSection>) =>
    setSections(course.sections.map((s, k) => (k === i ? { ...s, ...patch } : s)));

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const next = await saveCourse(course.id, {
        rev: course.rev,
        title: course.title,
        summary: course.summary,
        level: course.level,
        status: course.status,
        sections: course.sections,
      });
      setCourse(next);
      setDirty(false);
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  };

  const newLesson = async (i: number) => {
    const title = window.prompt("Titre de la nouvelle leçon");
    if (!title?.trim()) return;
    try {
      const article = await createArticle({ title: title.trim(), category: "pedagogie" });
      setArticles([{ ...article, hasPublishedVersion: false, commentsCount: 0, unresolvedComments: 0 } as ArticleSummary, ...articles]);
      setSection(i, { lessons: [...course.sections[i].lessons, article.id] });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const lessons = course.sections.flatMap((s) => s.lessons).map((l) => byId.get(l)).filter((a): a is ArticleSummary => !!a);
  const count = (pred: (a: ArticleSummary) => boolean) => lessons.filter(pred).length;
  const published = count((a) => a.hasPublishedVersion);
  const steps: { action: LessonsAction; label: string; n: number }[] = [
    { action: "submit", label: "Soumettre les brouillons", n: count((a) => a.status === "draft") },
    { action: "approve", label: "Approuver les relectures", n: count((a) => a.status === "in_review") },
    { action: "publish", label: "Publier les approuvées", n: count((a) => a.status === "approved") },
  ];

  const confirmations: Partial<Record<LessonsAction, string>> = {
    approve: "Approuver toutes les leçons en relecture ?",
    publish: "Publier les leçons approuvées ? Visibles des inscrits.",
  };

  const runStep = async (action: LessonsAction) => {
    const question = confirmations[action];
    if (question && !window.confirm(question)) return;
    setError(null);
    setNotice(null);
    try {
      const r = await lessonsAction(course.id, action);
      setNotice(`${r.done} leçon${r.done > 1 ? "s" : ""} traitée${r.done > 1 ? "s" : ""}.`);
      if (r.refused.length) setError(`Refusé : ${r.refused[0].error}${r.refused.length > 1 ? ` (et ${r.refused.length - 1} autre(s))` : ""}`);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Supprimer « ${course.title} » ? Les leçons jamais publiées seront supprimées.`)) return;
    await deleteCourse(course.id);
    router.push("/admin/cours");
  };

  return (
    <div className="pb-24 pt-6">
      <Link href="/admin/cours" className="link text-sm text-base-content/60">← Cours</Link>

      <div className="mt-4 grid gap-3">
        <input value={course.title} onChange={(e) => edit({ title: e.target.value })} className="input input-bordered text-xl font-bold" aria-label="Titre du cours" />
        <textarea
          value={course.summary}
          onChange={(e) => edit({ summary: e.target.value })}
          placeholder="Présentation du cours"
          className="textarea textarea-bordered min-h-24"
          aria-label="Présentation"
        />
        <div className="flex flex-wrap items-center gap-3">
          <select value={course.level} onChange={(e) => edit({ level: e.target.value as CourseLevel })} className="select select-bordered select-sm" aria-label="Niveau">
            {Object.entries(COURSE_LEVELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" className="toggle toggle-sm toggle-success" checked={course.status === "published"} onChange={(e) => edit({ status: e.target.checked ? "published" : "draft" })} />
            Publié
          </label>
          <a href={`/apprendre/apercu/${course.id}`} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">Aperçu</a>
          {course.status === "published" && (
            <Link href={`/apprendre/${course.slug}`} className="link link-primary text-sm">Voir le cours</Link>
          )}
        </div>
      </div>

      <section className={`mt-6 rounded-box border p-4 ${published === 0 ? "border-warning/50 bg-warning/10" : "border-base-300 bg-base-100"}`}>
        <p className="text-sm font-medium">
          {published} leçon{published > 1 ? "s" : ""} publiée{published > 1 ? "s" : ""} sur {lessons.length}
        </p>
        {published === 0 && (
          <p className="mt-0.5 text-xs text-base-content/65">Invisible tant qu’aucune leçon n’est publiée.</p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {steps.map((s) => (
            <button key={s.action} type="button" disabled={!s.n || dirty} onClick={() => runStep(s.action)} className="btn btn-outline btn-sm border-base-300">
              {s.label} ({s.n})
            </button>
          ))}
        </div>
        {dirty && <p className="mt-2 text-xs text-base-content/60">Enregistrez d’abord le cours.</p>}
        {notice && <p className="mt-2 text-sm text-success">{notice}</p>}
      </section>

      <div className="mt-8 grid gap-5">
        {course.sections.map((section, i) => (
          <section key={section.id} className="rounded-box border border-base-300 bg-base-100 p-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-base-content/55">Partie {i + 1}</span>
              <input value={section.title} onChange={(e) => setSection(i, { title: e.target.value })} className="input input-sm input-bordered flex-1 font-semibold" aria-label="Titre de la partie" />
              <button type="button" className={iconBtn} onClick={() => setSections(move(course.sections, i, i - 1))} aria-label="Monter la partie">↑</button>
              <button type="button" className={iconBtn} onClick={() => setSections(move(course.sections, i, i + 1))} aria-label="Descendre la partie">↓</button>
              <button
                type="button"
                className={iconBtn}
                disabled={course.sections.length === 1}
                onClick={() => setSections(course.sections.filter((_, k) => k !== i))}
                aria-label="Supprimer la partie"
              >
                ✕
              </button>
            </div>

            <ol className="mt-3 grid gap-1.5">
              {section.lessons.map((lid, j) => {
                const a = byId.get(lid);
                return (
                  <li key={lid} className="flex items-center gap-2 rounded-lg bg-base-200/60 px-3 py-2">
                    <span className="w-5 text-xs tabular-nums text-base-content/50">{j + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{a?.title ?? lid}</span>
                    <LessonStatus a={a} />
                    {a && <Link href={`/admin/articles/${a.id}`} className="link text-xs">Modifier</Link>}
                    <button type="button" className={iconBtn} onClick={() => setSection(i, { lessons: move(section.lessons, j, j - 1) })} aria-label="Monter la leçon">↑</button>
                    <button type="button" className={iconBtn} onClick={() => setSection(i, { lessons: move(section.lessons, j, j + 1) })} aria-label="Descendre la leçon">↓</button>
                    <button type="button" className={iconBtn} onClick={() => setSection(i, { lessons: section.lessons.filter((x) => x !== lid) })} aria-label="Retirer la leçon">✕</button>
                  </li>
                );
              })}
              {section.lessons.length === 0 && <li className="px-3 py-2 text-sm text-base-content/55">Aucune leçon.</li>}
            </ol>

            <div className="mt-3 flex flex-wrap gap-2">
              <select
                value=""
                onChange={(e) => e.target.value && setSection(i, { lessons: [...section.lessons, e.target.value] })}
                className="select select-bordered select-sm max-w-full flex-1"
                aria-label="Ajouter un article existant"
              >
                <option value="">Ajouter un article existant…</option>
                {free.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title} ({a.author.name})
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => newLesson(i)} className="btn btn-outline btn-sm border-base-300">Nouvelle leçon</button>
            </div>
          </section>
        ))}
        <button
          type="button"
          onClick={() => setSections([...course.sections, { id: crypto.randomUUID(), title: `Partie ${course.sections.length + 1}`, lessons: [] }])}
          className="btn btn-ghost btn-sm justify-self-start"
        >
          + Ajouter une partie
        </button>
      </div>

      <div className="fixed inset-x-0 bottom-[calc(4.2rem+env(safe-area-inset-bottom))] z-30 border-t border-base-300 bg-base-100/95 px-4 py-3 backdrop-blur wide:bottom-0">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <button type="button" onClick={save} disabled={busy || !dirty} className="btn btn-primary btn-sm">
            {busy ? "Enregistrement…" : "Enregistrer"}
          </button>
          {saved && !dirty && <span className="text-sm text-success">Enregistré</span>}
          {dirty && <span className="text-sm text-base-content/60">Modifications non enregistrées</span>}
          {error && <span className="text-sm text-error">{error}</span>}
          <button type="button" onClick={remove} className="btn btn-ghost btn-sm ml-auto text-error">Supprimer le cours</button>
        </div>
      </div>
    </div>
  );
}
