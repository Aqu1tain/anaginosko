import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumb from "@/app/_components/Breadcrumb";
import BreadcrumbJsonLd from "@/app/_components/BreadcrumbJsonLd";
import JsonLd from "@/app/_components/JsonLd";
import { SITE, clip, pageMetadata } from "@/lib/seo";
import { courseView, lessonPath } from "@/lib/learn";
import { COURSE_LEVELS } from "@/lib/courses";
import CourseProgress from "@/src/components/learn/CourseProgress";
import LessonList from "@/src/components/learn/LessonList";

export const revalidate = 300;
export const generateStaticParams = async () => [];

type Params = { params: Promise<{ course: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const c = courseView((await params).course);
  if (!c) return {};
  return pageMetadata({
    title: `${c.title} · cours de grec biblique`,
    description: clip(c.summary || `${c.title} : ${c.lessonCount} leçons de grec biblique.`, 220),
    path: `/apprendre/${c.slug}`,
  });
}

export default async function CoursePage({ params }: Params) {
  const c = courseView((await params).course);
  if (!c) notFound();
  const parts = c.parts.map((p) => ({ ...p, lessons: p.lessons.map((l) => ({ ...l, href: lessonPath(c, l) })) }));
  const lessons = parts.flatMap((p) => p.lessons).map((l) => ({ id: l.id, href: l.href }));

  return (
    <div className="mx-auto max-w-5xl pb-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Course",
          name: c.title,
          description: c.summary || c.title,
          url: `${SITE}/apprendre/${c.slug}`,
          inLanguage: "fr",
          isAccessibleForFree: true,
          provider: { "@type": "Organization", name: "Anaginosko", url: SITE },
        }}
      />
      <BreadcrumbJsonLd items={[{ name: "Accueil", path: "/" }, { name: "Apprendre", path: "/apprendre" }, { name: c.title }]} />
      <Breadcrumb items={[{ label: "Accueil", href: "/", home: true }, { label: "Apprendre", href: "/apprendre" }, { label: c.title }]} />
      <header className="max-w-2xl">
        <h1 className="text-4xl font-bold leading-tight">{c.title}</h1>
        {c.summary && <p className="mt-3 text-lg leading-relaxed text-base-content/70">{c.summary}</p>}
        <p className="mt-4 text-sm text-base-content/55">
          {COURSE_LEVELS[c.level]} · {c.parts.length} partie{c.parts.length > 1 ? "s" : ""} · {c.lessonCount} leçon{c.lessonCount > 1 ? "s" : ""}
        </p>
      </header>

      <div className="mt-10 grid gap-10 wide:grid-cols-[minmax(0,1fr)_17rem] wide:items-start">
        <LessonList parts={parts} />
        <aside className="order-first rounded-box border border-base-300 bg-base-100 p-5 wide:order-none wide:sticky wide:top-20">
          <CourseProgress lessons={lessons} />
        </aside>
      </div>
    </div>
  );
}
