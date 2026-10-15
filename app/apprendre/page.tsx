import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/app/_components/Breadcrumb";
import { pageMetadata } from "@/lib/seo";
import { lessonPath, publishedCourses } from "@/lib/learn";
import { COURSE_LEVELS } from "@/lib/courses";
import CourseProgress from "@/src/components/learn/CourseProgress";
import SignupCta from "@/src/components/learn/SignupCta";

export const revalidate = 300;

export const metadata: Metadata = pageMetadata({
  title: "Apprendre le grec biblique",
  description:
    "Cours gratuits de grec biblique, de l'alphabet aux déclinaisons, pour lire le Nouveau Testament et la Septante dans le texte. Alphabet et prononciation en accès libre.",
  path: "/apprendre",
});

const TOOLS = [
  { href: "/alphabet", title: "L’alphabet grec", text: "Les 24 lettres, leur tracé et leurs deux prononciations.", glyph: "Αα" },
  { href: "/prononciation", title: "La prononciation", text: "Érasmienne ou restituée : les deux systèmes expliqués.", glyph: "ῥ" },
];

export default function LearnPage() {
  const courses = publishedCourses();
  return (
    <div className="pb-10">
      <Breadcrumb items={[{ label: "Accueil", href: "/", home: true }, { label: "Apprendre" }]} />
      <h1 className="font-greek text-4xl font-bold leading-tight wide:text-5xl">Apprendre le grec biblique</h1>
      <p className="mt-3 max-w-[60ch] text-lg leading-relaxed text-base-content/75">
        Des cours progressifs pour passer de l’alphabet à la lecture suivie du Nouveau Testament et de la Septante.
      </p>

      <section className="mt-10">
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-base-content/55">En accès libre</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {TOOLS.map((t) => (
            <Link key={t.href} href={t.href} className="group flex items-center gap-4 rounded-box border border-base-300 bg-base-100 p-5 transition-colors hover:border-primary/40">
              <span lang="grc" className="font-greek grid h-14 w-14 shrink-0 place-items-center rounded-box bg-accent/10 text-3xl text-accent">{t.glyph}</span>
              <span>
                <span className="block font-semibold group-hover:text-primary">{t.title}</span>
                <span className="text-sm text-base-content/70">{t.text}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-base-content/55">Cours</h2>
        {courses.length === 0 ? (
          <p className="mt-3 rounded-box border border-dashed border-base-300 p-6 text-base-content/70">
            Les premiers cours sont en cours de relecture. Revenez bientôt.
          </p>
        ) : (
          <div className="mt-3 grid gap-4 wide:grid-cols-2">
            {courses.map((c) => {
              const lessons = c.parts.flatMap((p) => p.lessons).map((l) => ({ id: l.id, href: lessonPath(c, l) }));
              return (
                <article key={c.id} className="flex flex-col rounded-box border border-base-300 bg-base-100 p-6">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary/80">
                    {COURSE_LEVELS[c.level]} · {c.lessonCount} leçon{c.lessonCount > 1 ? "s" : ""}
                  </p>
                  <h3 className="mt-1.5 text-2xl font-bold leading-snug">
                    <Link href={`/apprendre/${c.slug}`} className="hover:text-primary">{c.title}</Link>
                  </h3>
                  {c.summary && <p className="mt-2 line-clamp-3 text-base-content/70">{c.summary}</p>}
                  <div className="mt-auto pt-5">
                    <CourseProgress lessons={lessons} compact />
                    <Link href={`/apprendre/${c.slug}`} className="link link-primary mt-3 inline-block text-sm font-semibold">
                      Voir le cours
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <div className="mt-12">
        <SignupCta />
      </div>
    </div>
  );
}
