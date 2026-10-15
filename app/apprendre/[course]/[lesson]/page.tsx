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
      <h2 className="text-lg font-semibold">Leçon réservée aux comptes</h2>
      <p className="mx-auto mt-1 max-w-[46ch] text-sm text-base-content/70">
        Créez un compte gratuit pour lire les leçons et garder votre progression. Pas de mot de passe : un code par e-mail ou Google.
      </p>
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
    <article className="mx-auto max-w-3xl pb-16">
      <Breadcrumb
        items={[
          { label: "Accueil", href: "/", home: true },
          { label: "Apprendre", href: "/apprendre" },
          { label: v.course.title, href: `/apprendre/${v.course.slug}` },
          { label: v.lesson.title },
        ]}
      />
      <p className="text-sm text-base-content/55">
        {v.part.title} · leçon {v.index + 1} sur {v.course.lessonCount}
      </p>
      <h1 className="mt-1 text-3xl font-bold leading-tight sm:text-4xl">{v.lesson.title}</h1>
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

      <details className="mt-12 rounded-box border border-base-300 bg-base-100">
        <summary className="cursor-pointer px-4 py-3 font-semibold">Plan du cours</summary>
        <div className="border-t border-base-300 p-4">
          <LessonList parts={parts} current={v.lesson.id} />
        </div>
      </details>
    </article>
  );
}
