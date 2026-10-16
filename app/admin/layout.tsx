import AdminFrame from "@/src/components/admin/AdminFrame";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminFrame>{children}</AdminFrame>;
}
