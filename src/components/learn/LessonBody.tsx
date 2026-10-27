import type { ReactNode } from "react";
import Link from "next/link";
import ArticleRenderer from "@/src/components/articles/ArticleRenderer";
import type { LessonRef, LessonView } from "@/lib/learn";
import LessonActions from "./LessonActions";
import LessonList from "./LessonList";

// Corps d'une leçon et plan du cours. `locked` remplace le contenu (mur de connexion) ;
// `preview` retire le suivi de progression.
export default function LessonBody({
  view: v,
  hrefOf,
  courseHref,
  locked,
  preview = false,
}: {
  view: LessonView;
  hrefOf: (l: LessonRef) => string;
  courseHref: string;
  locked?: ReactNode;
  preview?: boolean;
}) {
  const step = (l: LessonRef | null) => (l ? { href: hrefOf(l), title: l.title } : null);
  const parts = v.course.parts.map((p) => ({ ...p, lessons: p.lessons.map((l) => ({ ...l, href: hrefOf(l) })) }));
  return (
    <div className="grid gap-8 wide:gap-12 wide:grid-cols-[minmax(0,1fr)_17rem] wide:items-start">
      <div className="min-w-0 max-w-3xl">
        <p className="text-sm text-base-content/70">
          {v.part.title} · leçon {v.index + 1} sur {v.course.lessonCount}
        </p>
        <h1 className="mt-1 text-4xl font-bold leading-tight">{v.lesson.title}</h1>
        {v.lesson.excerpt && <p className="mt-3 text-lg leading-relaxed text-base-content/80">{v.lesson.excerpt}</p>}

        {locked ?? (
          <>
            <div className="mt-8">
              <ArticleRenderer content={v.lesson.content} />
            </div>
            <LessonActions courseId={v.course.id} lessonId={v.lesson.id} prev={step(v.prev)} next={step(v.next)} preview={preview} />
          </>
        )}
      </div>

      <aside className="wide:sticky wide:top-20 wide:max-h-[calc(100dvh-6rem)] wide:overflow-y-auto">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-base-content/70">
          <Link href={courseHref} className="hover:text-primary">{v.course.title}</Link>
        </p>
        <LessonList parts={parts} current={v.lesson.id} />
      </aside>
    </div>
  );
}
