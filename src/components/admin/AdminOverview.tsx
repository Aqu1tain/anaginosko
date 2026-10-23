"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/hooks/useAuth";
import { can, fetchAdminReports, fetchAdminStats, fetchContributors, isLearner, type AdminStats } from "@/src/lib/api";
import { fetchArticles } from "@/src/lib/articlesApi";
import { fetchCourses } from "@/src/lib/coursesApi";
import Avatar from "@/src/components/profile/Avatar";

type Task = { href: string; count: number; label: (n: number) => string };
type Figures = { views?: number; annotations?: number; learners?: number; published?: number };

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

// Vue d'ensemble : ce qui attend une action de cette personne, puis quelques chiffres.
export default function AdminOverview() {
  const { user, ready, photo, logout } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [figures, setFigures] = useState<Figures>({});

  const learner = isLearner(user);
  useEffect(() => {
    if (learner) router.replace("/mon-compte");
  }, [learner, router]);

  useEffect(() => {
    if (!user || learner) return;
    const me = user.id;
    const jobs: Promise<Task[]>[] = [];

    if (can(user, "articles") || can(user, "review") || can(user, "publish")) {
      jobs.push(
        fetchArticles().then((list) => {
          setFigures((f) => ({ ...f, published: list.filter((a) => a.hasPublishedVersion).length }));
          return [
            {
              href: "/admin/articles",
              count: can(user, "review")
                ? list.filter((a) => a.status === "in_review" && a.author.userId !== me && (a.reviewRequest?.reviewerId == null || a.reviewRequest.reviewerId === me)).length
                : 0,
              label: (n) => `${plural(n, "article attend", "articles attendent")} votre relecture`,
            },
            {
              href: "/admin/articles",
              count: list.filter((a) => a.status === "changes_requested" && a.author.userId === me).length,
              label: (n) => `${plural(n, "article", "articles")} à corriger`,
            },
            {
              href: "/admin/articles",
              count: can(user, "publish") ? list.filter((a) => a.status === "approved").length : 0,
              label: (n) => `${plural(n, "article approuvé", "articles approuvés")} à publier`,
            },
          ];
        }),
      );
    }
    if (can(user, "courses")) {
      jobs.push(
        fetchCourses().then(({ courses, articles }) => {
          const lessons = new Set(courses.flatMap((c) => c.sections.flatMap((s) => s.lessons)));
          const inReview = articles.filter((a) => lessons.has(a.id) && a.status === "in_review").length;
          return [{ href: "/admin/cours", count: inReview, label: (n) => `${plural(n, "leçon", "leçons")} en relecture` }];
        }),
      );
    }
    if (can(user, "reports")) {
      jobs.push(
        fetchAdminReports({ status: "pending" }).then((r) => [
          { href: "/admin/signalements", count: r.length, label: (n) => `${plural(n, "signalement", "signalements")} à traiter` },
        ]),
      );
    }
    if (can(user, "accounts")) {
      jobs.push(
        fetchContributors().then((d) => {
          setFigures((f) => ({ ...f, learners: d.learners ?? 0 }));
          return [{ href: "/admin/comptes", count: d.invitations.length, label: (n) => `${plural(n, "invitation", "invitations")} en attente` }];
        }),
      );
    }
    if (can(user, "dashboard")) {
      fetchAdminStats(30)
        .then((s: AdminStats) =>
          setFigures((f) => ({ ...f, views: s.viewsByDay.reduce((n, d) => n + d.views, 0), annotations: s.annotations })),
        )
        .catch(() => {});
    }

    Promise.all(jobs.map((j) => j.catch(() => [] as Task[]))).then((all) => setTasks(all.flat().filter((t) => t.count > 0)));
  }, [user, learner]);

  if (!ready || !user || learner) return null;

  const tiles = [
    { label: "Lectures, 30 derniers jours", value: figures.views, href: "/admin/statistiques" },
    { label: "Lecteurs inscrits", value: figures.learners, href: "/admin/comptes" },
    { label: "Articles publiés", value: figures.published, href: "/articles" },
    { label: "Annotations", value: figures.annotations, href: "/admin/annotations" },
  ].filter((t) => t.value !== undefined);

  return (
    <div className="space-y-8 pb-12 pt-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar name={user.displayName} photo={photo} size={48} />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Bonjour, {user.displayName}</h1>
            {user.title && <p className="text-sm text-base-content/50">{user.title}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/mon-profil" className="btn btn-outline btn-sm">
            Mon profil
          </Link>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={async () => {
              await logout();
              router.push("/");
            }}
          >
            Se déconnecter
          </button>
        </div>
      </header>

      <section>
        <h2 className="mb-3 text-lg font-semibold">À traiter</h2>
        {tasks === null ? (
          <p className="text-sm text-base-content/50">Chargement…</p>
        ) : tasks.length ? (
          <ul className="divide-y divide-base-300 overflow-hidden rounded-box border border-base-300 bg-base-100">
            {tasks.map((t) => (
              <li key={t.label(t.count)}>
                <Link href={t.href} className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-base-200/60">
                  <span className="font-medium">{t.label(t.count)}</span>
                  <span className="text-base-content/50" aria-hidden="true">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-base-content/50">Rien à traiter.</p>
        )}
      </section>

      {tiles.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">En bref</h2>
          <div className="grid grid-cols-2 gap-3 wide:grid-cols-4">
            {tiles.map((t) => (
              <Link key={t.label} href={t.href} className="rounded-box border border-base-300 bg-base-100 p-4 transition-colors hover:border-base-content/20">
                <span className="block text-3xl font-semibold tabular-nums">{t.value!.toLocaleString("fr-FR")}</span>
                <span className="mt-1 block text-sm text-base-content/70">{t.label}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
