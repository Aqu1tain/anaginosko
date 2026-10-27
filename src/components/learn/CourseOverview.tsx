import { COURSE_LEVELS } from "@/lib/courses";
import type { CourseView, LessonRef } from "@/lib/learn";
import CourseProgress from "./CourseProgress";
import LessonList from "./LessonList";

// Page d'un cours : en-tête, plan et progression. Partagée par la page publique et
// l'aperçu de l'équipe, qui ne diffèrent que par les adresses des leçons.
export default function CourseOverview({ course: c, hrefOf }: { course: CourseView; hrefOf: (l: LessonRef) => string }) {
  const parts = c.parts.map((p) => ({ ...p, lessons: p.lessons.map((l) => ({ ...l, href: hrefOf(l) })) }));
  const lessons = parts.flatMap((p) => p.lessons).map((l) => ({ id: l.id, href: l.href }));
  return (
    <>
      <header className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight">{c.title}</h1>
        {c.summary && <p className="mt-3 text-lg leading-relaxed text-base-content/80">{c.summary}</p>}
        <p className="mt-4 text-sm text-base-content/70">
          {COURSE_LEVELS[c.level]} · {c.parts.length} partie{c.parts.length > 1 ? "s" : ""} · {c.lessonCount} leçon{c.lessonCount > 1 ? "s" : ""}
        </p>
      </header>

      <div className="mt-8 grid gap-8 wide:gap-12 wide:grid-cols-[minmax(0,1fr)_17rem] wide:items-start">
        <LessonList parts={parts} />
        <aside className="order-first rounded-box border border-base-300 bg-base-100 p-5 wide:order-none wide:sticky wide:top-20">
          <CourseProgress lessons={lessons} />
        </aside>
      </div>
    </>
  );
}
