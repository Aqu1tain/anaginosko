import "server-only";
import fs from "node:fs";
import path from "node:path";
import { createArticle, saveArticle } from "./articles";
import { createCourse, listCourses, saveCourse, type Course, type CourseLevel } from "./courses";

// Cours rédigés dans le dépôt (content/cours, compilés dans data/cours par
// scripts/courses/build-course.mjs). L'import crée le cours et ses leçons en
// brouillon, au nom du compte qui importe ; la relecture suit son cours habituel.

type BundleLesson = { key: string; title: string; excerpt: string; content: unknown[] };
type Bundle = { slug: string; title: string; summary: string; level: CourseLevel; parts: { title: string; lessons: BundleLesson[] }[] };
type Importer = { id?: number; name?: string; isRoot?: boolean; permissions?: string[] };

const DIR = path.join(process.cwd(), "data", "cours");

function readBundles(): Bundle[] {
  if (!fs.existsSync(DIR)) return [];
  return fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8")) as Bundle);
}

const imported = (b: Bundle) => listCourses().some((c) => c.title === b.title);

export const listBundles = () =>
  readBundles().map((b) => ({
    slug: b.slug,
    title: b.title,
    lessons: b.parts.reduce((n, p) => n + p.lessons.length, 0),
    imported: imported(b),
  }));

export function importBundle(slug: string, auth: Importer): { ok: true; course: Course } | { ok: false; status: number; error: string } {
  const bundle = readBundles().find((b) => b.slug === slug);
  if (!bundle) return { ok: false, status: 404, error: "Cours introuvable." };
  if (imported(bundle)) return { ok: false, status: 409, error: "Ce cours est déjà importé." };

  const sections = [];
  for (const part of bundle.parts) {
    const lessons: string[] = [];
    for (const lesson of part.lessons) {
      const created = createArticle(auth, { title: lesson.title, category: "pedagogie" });
      if (!created.ok) return created;
      const saved = saveArticle(created.article.id, auth, { rev: created.article.rev, excerpt: lesson.excerpt, content: lesson.content });
      if (!saved.ok) return saved;
      lessons.push(created.article.id);
    }
    sections.push({ id: "", title: part.title, lessons });
  }

  const created = createCourse(bundle.title);
  if (!created.ok) return created;
  return saveCourse(created.course.id, { rev: created.course.rev, summary: bundle.summary, level: bundle.level, sections });
}
