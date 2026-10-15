import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumb from "@/app/_components/Breadcrumb";
import ArticleRenderer from "@/src/components/articles/ArticleRenderer";
import LessonActions from "@/src/components/learn/LessonActions";
import LessonList from "@/src/components/learn/LessonList";
import { clip, pageMetadata } from "@/lib/seo";
import { lessonPath, lessonView } from "@/lib/learn";
import { sessionUser } from "@/lib/session";

// Contenu réservé aux comptes : la page dépend du cookie de session.
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ course: string; lesson: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { course, lesson } = await params;
  const v = lessonView(course, lesson);
  if (!v) return {};
  return pageMetadata({
    title: `${v.lesson.title} · ${v.course.title}`,
    description: clip(v.lesson.excerpt || `Leçon ${v.index + 1} du cours « ${v.course.title} ».`, 220),
    path: lessonPath(v.course, v.lesson),
    type: "article",
  });
}

function Wall({ path }: { path: string }) {
  return (
    <div className="mt-8 rounded-box border border-base-300 bg-base-200/60 p-6 text-center">
      <h2 className="text-lg font-semibold">Connectez-vous pour lire la leçon.</h2>
      <Link href={`/login?next=${encodeURIComponent(path)}`} className="btn btn-primary mt-4 rounded-full px-6">
        Se connecter ou créer un compte
      </Link>
    </div>
  );
}

export default async function LessonPage({ params }: Params) {
  const { course, lesson } = await params;
  const v = lessonView(course, lesson);
  if (!v) notFound();
  const path = lessonPath(v.course, v.lesson);
  const session = await sessionUser();
  const step = (l: typeof v.prev) => (l ? { href: lessonPath(v.course, l), title: l.title } : null);
  const parts = v.course.parts.map((p) => ({ ...p, lessons: p.lessons.map((l) => ({ ...l, href: lessonPath(v.course, l) })) }));

  return (
    <article className="pb-16">
      <Breadcrumb
        items={[
          { label: "Accueil", href: "/", home: true },
          { label: "Apprendre", href: "/apprendre" },
          { label: v.course.title, href: `/apprendre/${v.course.slug}` },
          { label: v.lesson.title },
        ]}
      />
      <div className="grid gap-10 wide:grid-cols-[minmax(0,1fr)_17rem] wide:items-start">
        <div className="min-w-0 max-w-3xl">
          <p className="text-sm text-base-content/55">
            {v.part.title} · leçon {v.index + 1} sur {v.course.lessonCount}
          </p>
          <h1 className="mt-1 text-4xl font-bold leading-tight">{v.lesson.title}</h1>
          {v.lesson.excerpt && <p className="mt-3 text-lg leading-relaxed text-base-content/70">{v.lesson.excerpt}</p>}

          {session.ok ? (
            <>
              <div className="mt-8">
                <ArticleRenderer content={v.lesson.content} />
              </div>
              <LessonActions courseId={v.course.id} lessonId={v.lesson.id} prev={step(v.prev)} next={step(v.next)} />
            </>
          ) : (
            <Wall path={path} />
          )}
        </div>

        <aside className="wide:sticky wide:top-20">
          <p className="mb-3 text-sm font-semibold">
            <Link href={`/apprendre/${v.course.slug}`} className="hover:text-primary">{v.course.title}</Link>
          </p>
          <LessonList parts={parts} current={v.lesson.id} />
        </aside>
      </div>
    </article>
  );
}
