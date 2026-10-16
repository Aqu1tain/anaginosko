import type { Metadata } from "next";
import CourseEditor from "@/src/components/learn/admin/CourseEditor";

export const metadata: Metadata = { title: "Cours", robots: { index: false, follow: false } };

export default async function CourseEditorPage({ params }: { params: Promise<{ id: string }> }) {
  return <CourseEditor id={(await params).id} />;
}
