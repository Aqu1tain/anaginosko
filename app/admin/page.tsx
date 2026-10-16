import AdminOverview from "@/src/components/admin/AdminOverview";

export const metadata = { title: "Tableau de bord", robots: { index: false } };

export default function AdminPage() {
  return <AdminOverview />;
}
