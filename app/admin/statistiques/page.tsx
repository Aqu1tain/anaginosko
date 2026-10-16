import AdminView from "@/src/components/AdminView";

export const metadata = { title: "Statistiques", robots: { index: false } };

export default function AdminAnalyticsPage() {
  return <AdminView section="analytics" />;
}
