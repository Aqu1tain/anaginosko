import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import {
  fetchAdminStats,
  fetchAdminAnnotations,
  deleteAnnotation,
  type AdminStats,
  type AdminAnnotation,
} from "../lib/api";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-box border border-base-300 bg-base-100 px-4 py-3">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-base-content/60">{label}</div>
    </div>
  );
}

export default function AdminView() {
  const { user, ready } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [annos, setAnnos] = useState<AdminAnnotation[]>([]);
  const [error, setError] = useState(false);

  const reload = () => {
    Promise.all([fetchAdminStats(), fetchAdminAnnotations()])
      .then(([s, a]) => {
        setStats(s);
        setAnnos(a);
      })
      .catch(() => setError(true));
  };

  useEffect(() => {
    if (user?.role === "admin") reload();
  }, [user]);

  if (!ready) return null;
  if (user?.role !== "admin") {
    return (
      <div className="py-20 text-center text-base-content/70">
        <p>Accès réservé à l’administrateur.</p>
        <a href="#/login" className="link link-primary mt-3 inline-block">
          Se connecter
        </a>
      </div>
    );
  }
  if (error) return <p className="py-20 text-center text-base-content/70">Chargement impossible.</p>;

  const maxDay = Math.max(1, ...(stats?.viewsByDay.map((d) => d.views) ?? [1]));

  return (
    <div className="pb-8 pt-6">
      <h1 className="text-2xl font-bold">Tableau de bord</h1>

      {stats && (
        <>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Stat label="Visites" value={stats.views} />
            <Stat label="Annotations" value={stats.annotations} />
            <Stat label="Comptes" value={stats.users} />
          </div>

          {stats.viewsByDay.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-base-content/55">
                Visites (14 derniers jours)
              </h2>
              <div className="flex items-end gap-1" style={{ height: 80 }}>
                {stats.viewsByDay.map((d) => (
                  <div
                    key={d.day}
                    title={`${d.day}: ${d.views}`}
                    className="flex-1 rounded-t bg-primary/70"
                    style={{ height: `${(d.views / maxDay) * 100}%`, minHeight: 2 }}
                  />
                ))}
              </div>
            </section>
          )}

          {stats.topRefs.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-base-content/55">
                Textes les plus lus
              </h2>
              <div className="grid gap-1.5">
                {stats.topRefs.map((r) => (
                  <div key={r.ref} className="flex justify-between rounded-box bg-base-200 px-3 py-1.5 text-sm">
                    <span className="font-mono text-base-content/70">{r.ref}</span>
                    <span className="font-medium">{r.views}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <section className="mt-7">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-base-content/55">
          Annotations ({annos.length})
        </h2>
        <div className="grid gap-2">
          {annos.map((a) => (
            <div key={a.id} className="rounded-box border border-base-300 bg-base-100 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm leading-snug">{a.body}</div>
                  <div className="mt-1 text-xs italic text-base-content/55">{a.source}</div>
                  <div className="mt-1 text-xs text-base-content/45">
                    <span className="font-mono">{a.ref}</span>
                    {a.verse != null ? ` · v.${a.verse}` : ""} · <span className="font-greek">{a.author}</span>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    await deleteAnnotation(a.id);
                    reload();
                  }}
                  className="btn btn-ghost btn-xs text-error"
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}
          {annos.length === 0 && (
            <p className="text-sm text-base-content/55">Aucune annotation pour l’instant.</p>
          )}
        </div>
      </section>
    </div>
  );
}
