import AdminView from "@/src/components/AdminView";

export const metadata = { title: "Signalements", robots: { index: false } };

export default function AdminReportsPage() {
  return <AdminView section="reports" />;
}
