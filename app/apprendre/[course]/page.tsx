import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumb from "@/app/_components/Breadcrumb";
import BreadcrumbJsonLd from "@/app/_components/BreadcrumbJsonLd";
import JsonLd from "@/app/_components/JsonLd";
import { SITE, clip, pageMetadata } from "@/lib/seo";
import { courseView, lessonPath } from "@/lib/learn";
import CourseOverview from "@/src/components/learn/CourseOverview";

export const revalidate = 300;
export const generateStaticParams = async () => [];

type Params = { params: Promise<{ course: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const c = courseView((await params).course);
  if (!c) return {};
  return pageMetadata({
    title: `${c.title} · cours de grec biblique`,
    description: clip(c.summary || `${c.title} : ${c.lessonCount} leçons de grec biblique.`, 220),
    path: `/apprendre/${c.slug}`,
  });
}

export default async function CoursePage({ params }: Params) {
  const c = courseView((await params).course);
  if (!c) notFound();

  return (
    <div className="pb-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Course",
          name: c.title,
          description: c.summary || c.title,
          url: `${SITE}/apprendre/${c.slug}`,
          inLanguage: "fr",
          isAccessibleForFree: true,
          provider: { "@type": "Organization", name: "Anaginosko", url: SITE },
        }}
      />
      <BreadcrumbJsonLd items={[{ name: "Accueil", path: "/" }, { name: "Apprendre", path: "/apprendre" }, { name: c.title }]} />
      <Breadcrumb items={[{ label: "Accueil", href: "/", home: true }, { label: "Apprendre", href: "/apprendre" }, { label: c.title }]} />
      <CourseOverview course={c} hrefOf={(l) => lessonPath(c, l)} />
    </div>
  );
}
