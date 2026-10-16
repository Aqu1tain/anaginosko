import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { previewLesson, previewPath } from "@/lib/learn";
import { canPreview } from "@/lib/session";
import LessonBody from "@/src/components/learn/LessonBody";
import PreviewBanner from "../PreviewBanner";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Aperçu de la leçon", robots: { index: false, follow: false } };

export default async function LessonPreviewPage({ params }: { params: Promise<{ id: string; lesson: string }> }) {
  if (!(await canPreview())) notFound();
  const { id, lesson } = await params;
  const v = previewLesson(id, lesson);
  if (!v) notFound();
  return (
    <article className="pb-16">
      <PreviewBanner courseId={v.course.id} status={v.course.status} />
      <LessonBody view={v} hrefOf={(l) => previewPath(v.course, l)} courseHref={previewPath(v.course)} preview />
    </article>
  );
}
