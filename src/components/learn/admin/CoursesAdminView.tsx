"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/src/hooks/useAuth";
import { can } from "@/src/lib/api";
import { createCourse, fetchBundles, fetchCourses, importBundle, type CourseBundle } from "@/src/lib/coursesApi";
import { COURSE_LEVELS } from "@/src/data/courseLevels";
import type { Course } from "@/lib/courses";

export default function CoursesAdminView() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const allowed = can(user, "courses");
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [bundles, setBundles] = useState<CourseBundle[]>([]);
  const [importing, setImporting] = useState<string | null>(null);

  useEffect(() => {
    if (!allowed) return;
    fetchCourses().then((d) => setCourses(d.courses)).catch((e) => setError(e.message));
    fetchBundles().then(setBundles).catch(() => {});
  }, [allowed]);

  const runImport = async (slug: string) => {
    setImporting(slug);
    setError(null);
    try {
      const c = await importBundle(slug);
      router.push(`/admin/cours/${c.id}`);
    } catch (err) {
      setError((err as Error).message);
      setImporting(null);
    }
  };

  if (!ready) return null;
  if (!allowed)
    return (
      <div className="py-16 text-center">
        <p className="text-base-content/70">Réservé à l’équipe des cours.</p>
        <a href="/login?next=/admin/cours" className="link link-primary mt-3 inline-block">Se connecter</a>
      </div>
    );

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const c = await createCourse(title);
      router.push(`/admin/cours/${c.id}`);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="mx-auto max-w-3xl pb-10 pt-4">
      <Link href="/admin" className="link text-sm text-base-content/60">← Tableau de bord</Link>
      <h1 className="mt-3 text-2xl font-bold">Cours</h1>

      <form onSubmit={create} className="mt-6 flex gap-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre du nouveau cours" className="input input-bordered flex-1" required />
        <button type="submit" className="btn btn-primary">Créer</button>
      </form>
      {error && <p className="mt-3 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{error}</p>}

      {bundles.some((b) => !b.imported) && (
        <section className="mt-6 rounded-box border border-primary/30 bg-primary/5 p-4">
          <h2 className="font-semibold">À importer</h2>
          <p className="mt-1 text-sm text-base-content/70">Créés en brouillon, à votre nom.</p>
          <ul className="mt-3 grid gap-2">
            {bundles.filter((b) => !b.imported).map((b) => (
              <li key={b.slug} className="flex items-center justify-between gap-3 rounded-lg bg-base-100 px-3 py-2">
                <span className="text-sm">
                  <span className="font-medium">{b.title}</span>
                  <span className="text-base-content/60"> · {b.lessons} leçons</span>
                </span>
                <button type="button" onClick={() => runImport(b.slug)} disabled={importing !== null} className="btn btn-primary btn-sm">
                  {importing === b.slug ? "Import…" : "Importer"}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ul className="mt-6 divide-y divide-base-300 overflow-hidden rounded-box border border-base-300">
        {courses?.map((c) => {
          const n = c.sections.reduce((k, s) => k + s.lessons.length, 0);
          return (
            <li key={c.id}>
              <Link href={`/admin/cours/${c.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-base-200">
                <span>
                  <span className="font-medium">{c.title}</span>
                  <span className="block text-xs text-base-content/60">
                    {COURSE_LEVELS[c.level]} · {c.sections.length} partie{c.sections.length > 1 ? "s" : ""} · {n} leçon{n > 1 ? "s" : ""}
                  </span>
                </span>
                <span className={`badge badge-sm ${c.status === "published" ? "badge-success" : "badge-ghost"}`}>
                  {c.status === "published" ? "Publié" : "Brouillon"}
                </span>
              </Link>
            </li>
          );
        })}
        {courses?.length === 0 && <li className="px-4 py-6 text-center text-sm text-base-content/60">Aucun cours.</li>}
      </ul>
    </div>
  );
}
