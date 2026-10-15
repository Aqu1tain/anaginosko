import "server-only";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { COURSE_LEVELS, type CourseLevel } from "../src/data/courseLevels";

export { COURSE_LEVELS, type CourseLevel };

// Cours de la partie « Apprendre le grec » : un fichier JSON par cours dans
// ARTICLES_DIR/courses, écritures atomiques (tmp + rename) comme les articles. Un
// cours range des leçons par parties ; une leçon est un article (même éditeur, même
// relecture), désigné ici par son id. Un article rangé dans un cours sort de la
// liste des articles.

export type CourseStatus = "draft" | "published";
export type CourseSection = { id: string; title: string; lessons: string[] };
export type Course = {
  id: string;
  rev: number;
  slug: string;
  title: string;
  summary: string;
  level: CourseLevel;
  status: CourseStatus;
  sections: CourseSection[];
  createdAt: string;
  updatedAt: string;
};

const MAX_TITLE = 200;
const MAX_SUMMARY = 1000;
const MAX_SECTIONS = 50;
const MAX_LESSONS = 200;

const COURSES_DIR = path.join(process.env.ARTICLES_DIR || path.join(process.cwd(), ".articles"), "courses");
const coursePath = (id: string) => path.join(COURSES_DIR, `${id}.json`);
const now = () => new Date().toISOString();
const validId = (id: string) => /^[a-z0-9-]+$/i.test(id);

export const slugifyCourse = (title: string): string =>
  title
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "cours";

function readCourse(id: string): Course | null {
  try {
    return JSON.parse(fs.readFileSync(coursePath(id), "utf8")) as Course;
  } catch {
    return null;
  }
}

function writeCourse(c: Course) {
  fs.mkdirSync(COURSES_DIR, { recursive: true });
  const p = coursePath(c.id);
  fs.writeFileSync(`${p}.tmp`, JSON.stringify(c, null, 2));
  fs.renameSync(`${p}.tmp`, p);
}

export function listCourses(): Course[] {
  if (!fs.existsSync(COURSES_DIR)) return [];
  return fs
    .readdirSync(COURSES_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => readCourse(f.slice(0, -5)))
    .filter((c): c is Course => !!c)
    .sort((a, b) => a.title.localeCompare(b.title, "fr"));
}

export const getCourse = (id: string): Course | null => (validId(id) ? readCourse(id) : null);

export const getPublishedCourse = (slug: string): Course | null =>
  listCourses().find((c) => c.status === "published" && c.slug === slug) ?? null;

// Articles rangés dans un cours, publié ou non : ce sont des leçons.
export const lessonIds = (): Set<string> => new Set(listCourses().flatMap((c) => c.sections.flatMap((s) => s.lessons)));

export const courseOfLesson = (articleId: string): Course | null =>
  listCourses().find((c) => c.status === "published" && c.sections.some((s) => s.lessons.includes(articleId))) ?? null;

type Result = { ok: true; course: Course } | { ok: false; status: number; error: string };

function uniqueSlug(slug: string, selfId: string): string {
  const taken = new Set(listCourses().filter((c) => c.id !== selfId).map((c) => c.slug));
  if (!taken.has(slug)) return slug;
  let n = 2;
  while (taken.has(`${slug}-${n}`)) n++;
  return `${slug}-${n}`;
}

export function createCourse(title: unknown): Result {
  const t = typeof title === "string" ? title.trim() : "";
  if (!t) return { ok: false, status: 400, error: "Titre requis." };
  if (t.length > MAX_TITLE) return { ok: false, status: 400, error: "Titre trop long." };
  const id = randomUUID();
  const ts = now();
  const course: Course = {
    id,
    rev: 1,
    slug: uniqueSlug(slugifyCourse(t), id),
    title: t,
    summary: "",
    level: "debutant",
    status: "draft",
    sections: [{ id: randomUUID(), title: "Première partie", lessons: [] }],
    createdAt: ts,
    updatedAt: ts,
  };
  writeCourse(course);
  return { ok: true, course };
}

export type CoursePatch = {
  rev: number;
  title?: string;
  summary?: string;
  level?: CourseLevel;
  status?: CourseStatus;
  sections?: CourseSection[];
};

function cleanSections(input: unknown): CourseSection[] | null {
  if (!Array.isArray(input) || input.length > MAX_SECTIONS) return null;
  const seen = new Set<string>();
  const sections: CourseSection[] = [];
  for (const s of input) {
    const title = typeof s?.title === "string" ? s.title.trim().slice(0, MAX_TITLE) : "";
    if (!title || !Array.isArray(s.lessons) || s.lessons.length > MAX_LESSONS) return null;
    const lessons = s.lessons.filter((l: unknown): l is string => typeof l === "string" && validId(l) && !seen.has(l));
    lessons.forEach((l: string) => seen.add(l));
    sections.push({ id: typeof s.id === "string" && validId(s.id) ? s.id : randomUUID(), title, lessons });
  }
  return sections;
}

export function saveCourse(id: string, patch: CoursePatch): Result {
  const course = getCourse(id);
  if (!course) return { ok: false, status: 404, error: "Cours introuvable." };
  if (patch.rev !== course.rev) return { ok: false, status: 409, error: "Le cours a changé entre-temps : rechargez la page." };
  // L'adresse suit le titre tant que le cours n'est pas publié, puis reste fixe.
  const wasDraft = course.status === "draft";
  if (patch.title !== undefined) {
    const t = patch.title.trim();
    if (!t || t.length > MAX_TITLE) return { ok: false, status: 400, error: "Titre invalide." };
    course.title = t;
  }
  if (patch.summary !== undefined) course.summary = patch.summary.trim().slice(0, MAX_SUMMARY);
  if (patch.level !== undefined) {
    if (!(patch.level in COURSE_LEVELS)) return { ok: false, status: 400, error: "Niveau invalide." };
    course.level = patch.level;
  }
  if (patch.status !== undefined) {
    if (patch.status !== "draft" && patch.status !== "published") return { ok: false, status: 400, error: "Statut invalide." };
    course.status = patch.status;
  }
  if (patch.sections !== undefined) {
    const sections = cleanSections(patch.sections);
    if (!sections?.length) return { ok: false, status: 400, error: "Parties invalides." };
    course.sections = sections;
  }
  if (wasDraft) course.slug = uniqueSlug(slugifyCourse(course.title), course.id);
  course.rev += 1;
  course.updatedAt = now();
  writeCourse(course);
  return { ok: true, course };
}

export function deleteCourse(id: string): boolean {
  if (!getCourse(id)) return false;
  fs.rmSync(coursePath(id));
  return true;
}
