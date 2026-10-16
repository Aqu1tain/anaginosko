import AdminView from "@/src/components/AdminView";

export const metadata = { title: "Annotations", robots: { index: false } };

export default function AdminAnnotationsPage() {
  return <AdminView section="annotations" />;
}
