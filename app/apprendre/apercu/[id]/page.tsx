import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { previewCourse, previewPath } from "@/lib/learn";
import { canPreview } from "@/lib/session";
import CourseOverview from "@/src/components/learn/CourseOverview";
import PreviewBanner from "./PreviewBanner";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Aperçu du cours", robots: { index: false, follow: false } };

export default async function CoursePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await canPreview())) notFound();
  const c = previewCourse((await params).id);
  if (!c) notFound();
  return (
    <div className="pb-10">
      <PreviewBanner courseId={c.id} status={c.status} />
      <CourseOverview course={c} hrefOf={(l) => previewPath(c, l)} />
    </div>
  );
}
