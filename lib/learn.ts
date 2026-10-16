import "server-only";
import { getArticle, getPublishedArticle, type Article } from "./articles";
import { courseOfLesson, getCourse, getPublishedCourse, listCourses, type Course } from "./courses";

// Vue publique de « Apprendre le grec » : un cours publié et ses leçons publiées,
// dans l'ordre des parties. Une leçon encore en relecture n'apparaît pas.
// L'aperçu de l'équipe lit au contraire la version en cours de chaque leçon.

export type LessonRef = { id: string; slug: string; title: string; excerpt: string };
export type SectionView = { id: string; title: string; lessons: LessonRef[] };
export type CourseView = Course & { parts: SectionView[]; lessonCount: number };

const lessonRef = (a: Article): LessonRef => ({ id: a.id, slug: a.slug, title: a.title, excerpt: a.excerpt });

type Read = (id: string) => Article | null;

function view(course: Course, read: Read = getPublishedArticle): CourseView {
  const parts = course.sections
    .map((s) => ({
      id: s.id,
      title: s.title,
      lessons: s.lessons.map(read).filter((a): a is Article => !!a).map(lessonRef),
    }))
    .filter((s) => s.lessons.length > 0);
  return { ...course, parts, lessonCount: parts.reduce((n, s) => n + s.lessons.length, 0) };
}

export const publishedCourses = (): CourseView[] =>
  listCourses()
    .filter((c) => c.status === "published")
    .map((c) => view(c))
    .filter((c) => c.lessonCount > 0);

export function courseView(slug: string): CourseView | null {
  const course = getPublishedCourse(slug);
  if (!course) return null;
  const v = view(course);
  return v.lessonCount ? v : null;
}

export const lessonPath = (course: { slug: string }, lesson: { slug: string }) => `/apprendre/${course.slug}/${lesson.slug}`;

export type LessonView = {
  course: CourseView;
  part: SectionView;
  lesson: Article;
  index: number;
  prev: LessonRef | null;
  next: LessonRef | null;
};

function lessonAt(course: CourseView | null, match: (l: LessonRef) => boolean, read: Read): LessonView | null {
  if (!course) return null;
  const flat = course.parts.flatMap((part) => part.lessons.map((l) => ({ part, l })));
  const index = flat.findIndex((x) => match(x.l));
  const lesson = index < 0 ? null : read(flat[index].l.id);
  if (!lesson) return null;
  return {
    course,
    part: flat[index].part,
    lesson,
    index,
    prev: flat[index - 1]?.l ?? null,
    next: flat[index + 1]?.l ?? null,
  };
}

export const lessonView = (courseSlug: string, lessonSlug: string): LessonView | null =>
  lessonAt(courseView(courseSlug), (l) => l.slug === lessonSlug, getPublishedArticle);

export function previewCourse(id: string): CourseView | null {
  const course = getCourse(id);
  return course ? view(course, getArticle) : null;
}

export const previewLesson = (courseId: string, lessonId: string): LessonView | null =>
  lessonAt(previewCourse(courseId), (l) => l.id === lessonId, getArticle);

export const previewPath = (course: { id: string }, lesson?: { id: string }) =>
  `/apprendre/apercu/${course.id}${lesson ? `/${lesson.id}` : ""}`;

// Adresse d'un article devenu leçon (redirection depuis /articles/<slug>).
export function lessonHrefOf(articleId: string): string | null {
  const course = courseOfLesson(articleId);
  const lesson = getPublishedArticle(articleId);
  return course && lesson ? lessonPath(course, lesson) : null;
}
