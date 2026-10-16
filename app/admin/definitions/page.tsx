import AdminView from "@/src/components/AdminView";

export const metadata = { title: "Définitions", robots: { index: false } };

export default function AdminDefinitionsPage() {
  return <AdminView section="definitions" />;
}
