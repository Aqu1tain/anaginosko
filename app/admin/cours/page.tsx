import type { Metadata } from "next";
import CoursesAdminView from "@/src/components/learn/admin/CoursesAdminView";

export const metadata: Metadata = { title: "Cours · Anaginosko", robots: { index: false, follow: false } };

export default function CoursesAdminPage() {
  return <CoursesAdminView />;
}
