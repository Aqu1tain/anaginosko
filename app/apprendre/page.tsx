import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/app/_components/Breadcrumb";
import { pageMetadata } from "@/lib/seo";
import { lessonPath, publishedCourses } from "@/lib/learn";
import { COURSE_LEVELS } from "@/lib/courses";
import CourseProgress from "@/src/components/learn/CourseProgress";
import SignupCta from "@/src/components/learn/SignupCta";
import { letters } from "@/src/data/alphabet";

export const revalidate = 300;

export const metadata: Metadata = pageMetadata({
  title: "Apprendre le grec biblique",
  description:
    "Cours gratuits de grec biblique, de l'alphabet aux déclinaisons, pour lire le Nouveau Testament et la Septante dans le texte. Alphabet et prononciation en accès libre.",
  path: "/apprendre",
});

// Aperçus tirés des vraies données : quelques lettres, et les lettres dont les deux
// prononciations divergent.
const PREVIEW_LETTERS = letters.slice(0, 8);
const DIFFERING = letters.filter((l) => l.erasmien !== l.restituee && l.restituee.length < 12).slice(0, 3);

function ToolCard({ href, title, text, children }: { href: string; title: string; text: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="group flex flex-col overflow-hidden rounded-box border border-base-300 bg-base-100 transition-colors hover:border-primary/40">
      <div className="bg-base-200/50 px-5 py-4">{children}</div>
      <div className="p-5">
        <span className="block font-semibold group-hover:text-primary">{title}</span>
        <span className="text-sm text-base-content/70">{text}</span>
      </div>
    </Link>
  );
}

export default function LearnPage() {
  const courses = publishedCourses();
  return (
    <div className="pb-12">
      <Breadcrumb items={[{ label: "Accueil", href: "/", home: true }, { label: "Apprendre" }]} />
      <h1 className="text-3xl font-bold tracking-tight">Apprendre le grec biblique</h1>
      <p className="mt-3 max-w-[42rem] text-lg leading-relaxed text-base-content/70">
        De l’alphabet à la lecture du Nouveau Testament et de la Septante.
      </p>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Accès libre</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <ToolCard href="/alphabet" title="L’alphabet grec" text="Les 24 lettres, leur tracé et leurs deux prononciations.">
            <div className="grid grid-cols-4 gap-2">
              {PREVIEW_LETTERS.map((l) => (
                <span key={l.name} className="flex flex-col items-center rounded-lg bg-base-100 py-1.5">
                  <span lang="grc" className="font-greek text-2xl leading-none">{l.upper}{l.lower}</span>
                  <span className="mt-1 text-[0.65rem] text-base-content/50">{l.name}</span>
                </span>
              ))}
            </div>
          </ToolCard>
          <ToolCard href="/prononciation" title="La prononciation" text="Érasmienne ou restituée, lettre par lettre.">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[0.65rem] uppercase tracking-wide text-base-content/50">
                  <th className="pb-1 font-semibold">Lettre</th>
                  <th className="pb-1 font-semibold">Érasmienne</th>
                  <th className="pb-1 font-semibold">Restituée</th>
                </tr>
              </thead>
              <tbody>
                {DIFFERING.map((l) => (
                  <tr key={l.name} className="border-t border-base-300/70">
                    <td lang="grc" className="font-greek py-1.5 text-xl">{l.lower}</td>
                    <td className="py-1.5">{l.erasmien}</td>
                    <td className="py-1.5 text-accent">{l.restituee}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ToolCard>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-semibold">Cours</h2>
        {courses.length === 0 ? (
          <p className="mt-3 text-sm text-base-content/50">Aucun cours publié.</p>
        ) : (
          <div className="mt-3 grid gap-4 wide:grid-cols-2">
            {courses.map((c) => {
              const lessons = c.parts.flatMap((p) => p.lessons).map((l) => ({ id: l.id, href: lessonPath(c, l) }));
              return (
                <Link key={c.id} href={`/apprendre/${c.slug}`} className="group flex flex-col rounded-box border border-base-300 bg-base-100 p-5 transition-colors hover:border-primary/40">
                  <h3 className="text-lg font-semibold leading-snug group-hover:text-primary">{c.title}</h3>
                  <p className="mt-1 text-sm text-base-content/50">
                    {COURSE_LEVELS[c.level]} · {c.lessonCount} leçon{c.lessonCount > 1 ? "s" : ""}
                  </p>
                  {c.summary && <p className="mt-3 line-clamp-3 text-base-content/70">{c.summary}</p>}
                  <div className="mt-auto pt-4">
                    <CourseProgress lessons={lessons} compact />
                  </div>
                </Link>
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
