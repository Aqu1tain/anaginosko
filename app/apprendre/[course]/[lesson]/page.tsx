import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumb from "@/app/_components/Breadcrumb";
import LessonBody from "@/src/components/learn/LessonBody";
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
        Se connecter
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
      <LessonBody
        view={v}
        hrefOf={(l) => lessonPath(v.course, l)}
        courseHref={`/apprendre/${v.course.slug}`}
        locked={session.ok ? undefined : <Wall path={path} />}
      />
    </article>
  );
}
