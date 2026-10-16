import Link from "next/link";

export default function PreviewBanner({ courseId, status }: { courseId: string; status: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-box border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
      <span>
        <strong>Aperçu</strong> · version en cours de chaque leçon{status === "draft" ? ", cours non publié" : ""}.
      </span>
      <Link href={`/admin/cours/${courseId}`} className="link">Retour à l’édition</Link>
    </div>
  );
}
